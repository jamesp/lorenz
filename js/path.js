var WIDTH = window.innerWidth * 0.8,
    HEIGHT = window.innerHeight * 0.99,
    maxVertices = 50000;


var Vector = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
};

Vector.prototype = {
    add: function (v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    },
    invert: function () {
        return new Vector(-this.x, -this.y, -this.z);
    },
    scale: function (s) {
        return new Vector(this.x * s, this.y * s, this.z * s);
    },
    subtract: function (v) {
        return this.add(v.invert());
    },
    dot: function (v) {
        return this.x * v.x + this.y * v.y + this.z + v.z;
    },
    rk4: function (h, fn) {
        // perform a step of rk4 using the given step size and function
        var k1 = fn(this).scale(h),
            k2 = fn(this.add(k1.scale(0.5))).scale(h),
            k3 = fn(this.add(k2.scale(0.5))).scale(h),
            k4 = fn(this.add(k3)).scale(h);
        return this.add((k1.add(k2.scale(2)).add(k3.scale(2)).add(k4)).scale(1 / 6));
    }
};

var lorenz_step = function (pos, sigma, rho, beta) {
    var xdot = sigma * (pos.y - pos.x),
        ydot = pos.x * (rho - pos.z) - pos.y,
        zdot = pos.x * pos.y - (beta * pos.z);
    return new Vector(xdot, ydot, zdot);
};

var posInitial = new Vector(10, 1, 10),
    sigma = 10,
    rho = 28,
    beta = 8 / 3;

var l = function (x) {
    return lorenz_step(x, sigma, rho, beta);
};

var points = [],
    pos = posInitial;


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, WIDTH/HEIGHT, 0.1, 1000);


var renderer = new THREE.WebGLRenderer();
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColorHex( 0xffffff, 1 );

document.body.appendChild(renderer.domElement);
controls = new THREE.OrbitControls( camera );

camera.position.set(0, 0, 200);
camera.lookAt(new THREE.Vector3(0, 0, 0));
var material = new THREE.LineBasicMaterial({
    vertexColors: THREE.VertexColors
});

var geometry = new THREE.Geometry();
geometry.dynamic = true;

var line = new THREE.Line(geometry, material);

for (var i = 0; i < maxVertices; i++) {
    geometry.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    geometry.colors.push(new THREE.Color("rgb(255,255,255)"));
}

var nextV = 1;

scene.add(line);
renderer.render(scene, camera);

function render() {
    requestAnimationFrame(render);
    nextV += 1;
    // line.rotation.x += 0.001;
    // line.rotation.z -= 0.001;
    pos = pos.rk4(0.005, l);
    geometry.vertices[nextV].set(pos.x, pos.y, pos.z);
    geometry.colors[nextV-1].set("rgb(0,0,0)");
    geometry.verticesNeedUpdate = true;
    geometry.colorsNeedUpdate = true;
    renderer.render(scene, camera);
}

render();