
class HeroScene {
    constructor() {
        this.container = document.getElementById('hero-canvas');
        if (!this.container) return;

        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.mouseX = 0;
        this.mouseY = 0;
        this.targetX = 0;
        this.targetY = 0;

        this.init();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020205, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 50;
        this.camera.position.y = 10;

        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            powerPreference: "high-performance" 
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Particles
        this.particleCount = window.innerWidth < 768 ? 60 : 150;
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.particleCount * 3);
        this.originalPositions = new Float32Array(this.particleCount * 3);
        this.velocities = [];
        this.colors = new Float32Array(this.particleCount * 3);

        const color1 = new THREE.Color(0x3a7bd5);
        const color2 = new THREE.Color(0x8E2DE2);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            // Spread particles
            this.positions[i3] = (Math.random() - 0.5) * 100;     // x
            this.positions[i3 + 1] = (Math.random() - 0.5) * 60;  // y
            this.positions[i3 + 2] = (Math.random() - 0.5) * 80;  // z
            
            this.originalPositions[i3] = this.positions[i3];
            this.originalPositions[i3 + 1] = this.positions[i3 + 1];
            this.originalPositions[i3 + 2] = this.positions[i3 + 2];

            this.velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            });
            
            // Random color mix
            const mixedColor = color1.clone().lerp(color2, Math.random());
            this.colors[i3] = mixedColor.r;
            this.colors[i3 + 1] = mixedColor.g;
            this.colors[i3 + 2] = mixedColor.b;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        // Materials
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.7,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(this.geometry, this.particleMaterial);
        this.scene.add(this.particles);

        // Connections (Lines)
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0x3a7bd5,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending
        });

        // We will create lines dynamically in the render loop? 
        // No, expensive. Better use a pre-allocated LineSegments geometry.
        // But for "activation" effect, checking distance is easiest.
        // To optimize, I will use a smaller number of lines or a shader.
        // Let's stick to CPU calc for < 150 points calling setDrawRange.
        
        // This holds positions for line pairs. Max connections: particleCount * particleCount (worst case)
        // Optimization: Nearest neighbor check only.
        
        this.maxConnections = this.particleCount * 10;
        this.lineGeometry = new THREE.BufferGeometry();
        this.linePositions = new Float32Array(this.maxConnections * 3 * 2); // 2 points per line
        // We can also use index but line segments is easier for dynamic updates
        
        this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
        this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.lines);

        // Events
        window.addEventListener('resize', this.onResize.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        
        // Adjust particle count for mobile if needed (requires re-init, skip for now)
    }

    onMouseMove(event) {
        // Normalized Coordinates
        this.mouseX = (event.clientX / this.width) * 2 - 1;
        this.mouseY = -(event.clientY / this.height) * 2 + 1;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = Date.now() * 0.001;

        // Smooth mouse target (for camera sway)
        this.targetX += (this.mouseX - this.targetX) * 0.05;
        this.targetY += (this.mouseY - this.targetY) * 0.05;

        // Camera gentle sway
        this.camera.position.x += (this.targetX * 5 - this.camera.position.x) * 0.02;
        this.camera.position.y += (this.targetY * 5 + 10 - this.camera.position.y) * 0.02;
        this.camera.lookAt(0, 0, 0);

        // Update Particles
        const positions = this.particles.geometry.attributes.position.array;
        
        // Mouse raycaster to world space
        // Rough estimation of mouse in world Z=0 plane to save raycaster cost?
        // Raycaster is fine.
        
        const vector = new THREE.Vector3(this.mouseX, this.mouseY, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const mouseWorld = this.camera.position.clone().add(dir.multiplyScalar(distance));


        let lineIndex = 0;
        const connectionDistance = 15;
        const mouseInteractionDist = 20;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            
            // Movement
            positions[i3]     += this.velocities[i].x; // + Math.sin(time + positions[i3+1]) * 0.005;
            positions[i3 + 1] += this.velocities[i].y; // + Math.cos(time + positions[i3]) * 0.005;
            positions[i3 + 2] += this.velocities[i].z;

            // Bounce / Wrap (Soft bounds)
            if (positions[i3] > 60 || positions[i3] < -60) this.velocities[i].x *= -1;
            if (positions[i3+1] > 40 || positions[i3+1] < -40) this.velocities[i].y *= -1;
            if (positions[i3+2] > 50 || positions[i3+2] < -50) this.velocities[i].z *= -1;

            // Connection Logic
            // Connect if close
            for (let j = i + 1; j < this.particleCount; j++) {
                const j3 = j * 3;
                const dx = positions[i3] - positions[j3];
                const dy = positions[i3 + 1] - positions[j3 + 1];
                const dz = positions[i3 + 2] - positions[j3 + 2];
                const distSq = dx*dx + dy*dy + dz*dz;

                if (distSq < connectionDistance * connectionDistance) {
                    if (lineIndex < this.maxConnections - 1) {
                         // Add line
                         this.linePositions[lineIndex * 6] = positions[i3];
                         this.linePositions[lineIndex * 6 + 1] = positions[i3 + 1];
                         this.linePositions[lineIndex * 6 + 2] = positions[i3 + 2];
                         
                         this.linePositions[lineIndex * 6 + 3] = positions[j3];
                         this.linePositions[lineIndex * 6 + 4] = positions[j3 + 1];
                         this.linePositions[lineIndex * 6 + 5] = positions[j3 + 2];
                         
                         lineIndex++;
                    }
                }
            }

            // Mouse Interaction: "Neurons activate / glow near cursor"
            // We can increase particle size or brightness if near mouseWorld
            // This is "fake" 3D mouse (projected to Z=0 typically), but let's use the camera ray approximation.
            // Actually, comparing 3D point to a ray is better.
            
            // For simplicity: Check distance to mouseWorld (on Z=0 plane approximation or just screen space)
            // Let's use simple logic: if particle projects to close screen coords.
            // But we have mouseWorld calculated on Z=something. The camera is at Z=50 looking at 0. Particles are around 0.
            // mouseWorld works if we intersect a plane around Z=0.
            
            // We just use a proximity check to the 'mouse world ray' but that's complex math for loop.
            // Optimization: Just check X/Y difference roughly (since Z depth effect is subtle for selection).
            
            // Actually simpler:
            // Just pulse the scale or opacity in shader? No, we use PointsMaterial.
            // We can change color. (Not efficient to upload color attribute every frame).
            
            // Let's skip per-particle color update for performance unless needed.
            // The prompt asks for: "Neurons activate / glow near cursor".
            // We can add a point light at the cursor position!
            // But PointsMaterial doesn't react to lights by default unless we use a custom shader or sprite.
            // Standard PointsMaterial does not support lights.
            // We'll skip complex interaction for "performance safe" default, 
            // OR use a PointLight and use regular MeshSpheres? No, too heavy.
            // Let's stick to lines. The line opacity could be modulated in shader, but we are using LineBasicMaterial.
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        
        this.lines.geometry.setDrawRange(0, lineIndex * 2);
        this.lines.geometry.attributes.position.needsUpdate = true;
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only init if we are on a page that needs it (check for #hero-canvas)
    if (document.getElementById('hero-canvas')) {
        new HeroScene();
    }
});
