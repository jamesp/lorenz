// set the scene size
var WIDTH = 600,
    HEIGHT = 480;

var Vector = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
};

Vector.prototype = {
    add: function(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    },
    invert: function() {
        return new Vector(-this.x, -this.y, -this.z);
    },
    scale: function(s) {
        return new Vector(this.x * s, this.y * s, this.z * s);
    },
    subtract: function(v) {
        return this.add(v.invert());
    },
    dot: function(v) {
        return this.x * v.x + this.y * v.y + this.z + v.z;
    }
};

var RK4 = function(v, h, fn) {
    // perform a step of rk4 using the given step size and function
    var k1 = fn(v).scale(h),
        k2 = fn(v.add(k1.scale(0.5))).scale(h),
        k3 = fn(v.add(k2.scale(0.5))).scale(h),
        k4 = fn(v.add(k3)).scale(h);
    return v.add((k1.add(k2.scale(2)).add(k3.scale(2)).add(k4)).scale(1 / 6));
};

var lorenz_step = function(pos, sigma, rho, beta) {
    var xdot = sigma * (pos.y - pos.x),
        ydot = pos.x * (rho - pos.z) - pos.y,
        zdot = pos.x * pos.y - (beta * pos.z);
    return new Vector(xdot, ydot, zdot);
};

var posInitial = new Vector(10, 1, 10),
    sigma = 10,
    rho = 28,
    beta = 8 / 3;

var l = function(x) {
    return lorenz_step(x, sigma, rho, beta);
};





// Three.js visualisation
var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 0.1,
    FAR = 10000;

var renderer = new THREE.WebGLRenderer({
    clearColor: new THREE.Color(0, 1),
    clearAlpha: 1
}),
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR),
    scene = new THREE.Scene();

scene.add(camera);
scene.fog = new THREE.FogExp2(0x000000, 0.0009);

camera.position.z = 300; // camera starts at (0,0,0)

renderer.setSize(WIDTH, HEIGHT);
document.body.appendChild(renderer.domElement);

var sprite = THREE.ImageUtils.loadTexture("image/particle2.png")
particleCount = 100,
    particles = new THREE.Geometry(),
    material = new THREE.ParticleSystemMaterial({
        size: 24,
        map: sprite,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

material.alphaTest = 0.5;



// randomise the starting positions of the particles
for (var p = 0; p < particleCount; p++) {
    var pX = Math.random() * 500 - 250,
        pY = Math.random() * 500 - 250,
        pZ = Math.random() * 500 - 250,
        particle = new THREE.Vector3(pX, pY, pZ);
    particle.vec = new Vector(pX, pY, pZ);

    particles.vertices.push(particle);
}

var particleSystem = new THREE.ParticleSystem(particles, material);
particleSystem.dynamic = true;

scene.add(particleSystem);

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
    particles.vertices.forEach(function(p) {
        p.vec = RK4(p.vec, 0.001, l);
        p.set(p.vec.x, p.vec.y, p.vec.z);
    });
    particleSystem.geometry.verticesNeedUpdate = true
    // camera.rotation.x += 0.001;
    // camera.rotation.y -= 0.001;
}
render();
