var WIDTH = window.innerWidth * 0.8,
    HEIGHT = window.innerHeight * 0.99,
    maxVertices = 50000;


var Vector = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.length = Math.sqrt(this.abs());
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
        return this.x * v.x + this.y * v.y + this.z * v.z;
    },
    rk4: function (h, fn) {
        // perform a step of rk4 using the given step size and function
        var k1 = fn(this).scale(h),
            k2 = fn(this.add(k1.scale(0.5))).scale(h),
            k3 = fn(this.add(k2.scale(0.5))).scale(h),
            k4 = fn(this.add(k3)).scale(h);
        return this.add((k1.add(k2.scale(2)).add(k3.scale(2)).add(k4)).scale(1 / 6));
    },
    abs: function() {
        return this.dot(this);
    },
    normalise: function(){
        var len = this.length;
        return this.scale(1/this.length);
    },
    project: function(v) {
        // project this vector along v
        return this.scale(this.dot(v) / this.abs());
    }
};

var gram_schmidt = function(vectors, normalise) {
    var normalise = normalise || false;
    var orthog_vectors = [];
    vectors.forEach(function (v) {
        var p = orthog_vectors.map(function(u) { return u.project(v); });
        var u = v.subtract(p.reduce(function(u,v) { return u.add(v); }, new Vector(0,0,0)));
        orthog_vectors.push(u);
    });
    if (normalise) {
        return orthog_vectors.map(function(v) { return v.normalise(); });
    } else {
        return orthog_vectors;
    }
}


var mouseX = 0, mouseY = 0,
    zoomLevel = 50,
    windowHalfX = window.innerWidth / 2,
    windowHalfY = window.innerHeight / 2;


var lorenz_step = function (pos, sigma, rho, beta) {
    var xdot = sigma * (pos.y - pos.x),
        ydot = pos.x * (rho - pos.z) - pos.y,
        zdot = pos.x * pos.y - (beta * pos.z);
    return new Vector(xdot, ydot, zdot);
};

var posInitial = new Vector(5.2, 8.5, 27.0),
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
camera.setLens(zoomLevel);

var renderer = new THREE.CanvasRenderer();
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColorHex( 0xffffff, 1 );

document.body.appendChild(renderer.domElement);
// controls = new THREE.OrbitControls( camera );

camera.position.set(0, 0, 200);
camera.lookAt(new THREE.Vector3(0, 0, 0));
var material = new THREE.LineBasicMaterial({
    color: 0x000000
});

var geometry = new THREE.Geometry();
geometry.dynamic = true;

// var line = new THREE.Line(geometry, material);

// for (var i = 0; i < maxVertices; i++) {
//     geometry.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z));
//     geometry.colors.push(new THREE.Color("rgb(255,255,255)"));
// }

// var nextV = 1;

// scene.add(line);
renderer.render(scene, camera);

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onMouseScroll (event) {

    event.preventDefault();

    var delta = event.wheelDelta;
    zoomLevel += delta / 100;
    camera.setLens(zoomLevel);

}

function onDocumentMouseMove(event) {

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

}

function onDocumentTouchStart( event ) {

    if ( event.touches.length > 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}

function onDocumentTouchMove( event ) {

    if ( event.touches.length == 1 ) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

}


document.addEventListener( 'mousemove', onDocumentMouseMove, false );
document.addEventListener( 'touchstart', onDocumentTouchStart, false );
document.addEventListener( 'touchmove', onDocumentTouchMove, false );
window.addEventListener( 'resize', onWindowResize, false );
document.addEventListener( 'mousewheel', onMouseScroll, false );

function render() {
    requestAnimationFrame(render);

    camera.position.x += ( mouseX - camera.position.x ) * .1;
    camera.position.y += ( - mouseY + 200 - camera.position.y ) * .1;
    camera.lookAt( scene.position );

    //nextV += 1;
    // line.rotation.x += 0.001;
    // line.rotation.z -= 0.001;
    old_pos = pos;
    pos = pos.rk4(0.01, l);
    var geo = new THREE.Geometry();
    var line = new THREE.Line(geo, material);
    geo.vertices.push(new THREE.Vector3(old_pos.x, old_pos.y, old_pos.z));
    geo.vertices.push(new THREE.Vector3(pos.x, pos.y, pos.z));
    scene.add(line);
    // geometry.vertices[nextV].set(pos.x, pos.y, pos.z);
    // geometry.colors[nextV-1].set("rgb(0,0,0)");
    // geometry.verticesNeedUpdate = true;
    // geometry.colorsNeedUpdate = true;
    renderer.render(scene, camera);
}
