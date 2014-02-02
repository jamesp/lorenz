// set the scene size
var WIDTH = 400,
    HEIGHT = 300;

// set some camera attributes
var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

var renderer = new THREE.WebGLRenderer(),
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR),
    scene = new THREE.Scene();

scene.add(camera);
camera.position.z = 100; // camera starts at (0,0,0)

renderer.setSize(WIDTH, HEIGHT);
document.body.appendChild(renderer.domElement);

var particleCount = 100,
    particles = new THREE.Geometry(),
    pMaterial = new THREE.ParticleBasicMaterial({
        color: 0xFFFFFF,
        size: 20,
        map: THREE.ImageUtils.loadTexture(
            "image/particle.png"
          ),
        blending: THREE.AdditiveBlending,
        transparent: true
    });


for (var p = 0; p < particleCount; p++) {
    var pX = Math.random() * 500 - 250,
        pY = Math.random() * 500 - 250,
        pZ = Math.random() * 500 - 250,
        particle = new THREE.Vector3(pX, pY, pZ);
    particles.vertices.push(particle);
}

var particleSystem = new THREE.ParticleSystem(
    particles,
    pMaterial);

scene.add(particleSystem);

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    camera.rotation.x += 0.001;
    camera.rotation.y -= 0.001;
}
render();
