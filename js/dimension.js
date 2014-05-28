var Vector = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.arr = [x,y,z];
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
    },
    dist: function(to) { // distance to another vector
        return this.subtract(to).length
    }
};

function gram_schmidt (vectors, normalise) {
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

function make_lorenz(sigma, r, b) {
    return function lorenz(pos) {
        var xdot = sigma * (pos.y - pos.x),
            ydot = pos.x * (r - pos.z) - pos.y,
            zdot = pos.x * pos.y - (b * pos.z);
        return new Vector(xdot, ydot, zdot);
    }
}

function make_lorenz_jacobian(sigma, r, b) {
    return function jacobian_at(pos) {
        return function jacobian(v) {
            var dxdot = -sigma*v.x + sigma*v.y,
                dydot = (r - pos.z) * v.x - v.y - pos.x * v.z,
                dzdot = pos.y * v.x + pos.x * v.y - b * v.z;
            return new Vector(dxdot, dydot, dzdot);
        }
    }
}

function vectorRK4(x, h, fn) {
    // perform a step of rk4 using the given step size and function
    var k1 = fn(x).scale(h),
        k2 = fn(x.add(k1.scale(0.5))).scale(h),
        k3 = fn(x.add(k2.scale(0.5))).scale(h),
        k4 = fn(x.add(k3)).scale(h);
    return x.add((k1.add(k2.scale(2)).add(k3.scale(2)).add(k4)).scale(1 / 6));
}

var x0 = new Vector(5.2, 8.5, 27.0),
    sigma = 10,
    r = 28,
    b = 8 / 3;

var std_lorenz = make_lorenz(sigma, r, b),
    std_jac = make_lorenz_jacobian(sigma, r, b);

var peturb = [
    new Vector(1,0,0),
    new Vector(0,1,0),
    new Vector(0,0,1)];

var t = 0,
    x = x0,
    x_1 = x0,
    p = peturb,
    p_norm = peturb,
    u = peturb,
    sums = [0,0,0],
    exponents = [0,0,0],
    h = 0.01;

function run() {
    t = t + h;
    var jac = std_jac(x);
    x_1 = x;
    x = vectorRK4(x, h, std_lorenz);
    u = p.map(function(v) { return vectorRK4(v, h, jac); });
    orthogonal = gram_schmidt(u);
    orthonormal = gram_schmidt(u, true);
    p = orthonormal;
    lorenzVis.render(x);
    vectorVis.render(u, orthogonal, orthonormal);
    sums = sums.map(function(e, i) {
        return e + Math.log(orthogonal[i].length);
    });
    exponents = sums.map(function(e) { return e / t; });
    showExponents(exponents);
}

function showExponents(es) {
    var div = d3.select('#exponents');

    var rows = d3.selectAll('.exponent').data(es);

    rows.text(function(d) { return d.toFixed(4); });

    d3.select('#exponent_sum').text((es.reduce(function(x,y) {return x+y; })).toFixed(4));

}


// === 3D Visualisation ===
function toThreeVec(v) {
    return new THREE.Vector3(v.x, v.y, v.z);
}
var material = new THREE.LineBasicMaterial({
    color: 0x000000
});


// visualise the perturbation vectors



var vectorVis = {
        scene: new THREE.Scene(),
        camera: new THREE.PerspectiveCamera(50, 1, 0.1, 1000),

        init: function(canvas) {
            var vis = this;
            var c = $(canvas);
            this.renderer = new THREE.CanvasRenderer({canvas: c.get(0)});
            this.renderer.setSize(c.width(), c.height());

            this.camera.setLens(100);
            this.camera.position.set(0, 0, 10);
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));

            // store three types of vectors
            this.vector_group_names = ['actual', 'orthogonal', 'normed'];
            this.vector_groups = []
            this.vector_group_names.forEach(function (s) {
                var vectors = [1,2,3].map(function() {
                    var geo = new THREE.Geometry();
                    var line = new THREE.Line(geo, material);
                    geo.vertices.push(new THREE.Vector3(0, 0, 0));
                    geo.vertices.push(new THREE.Vector3(0, 0, 0));
                    vis.scene.add(line);
                    return geo;
                });
                vis.vector_groups.push(vectors);
            });
        },

        update_table: function(data) {
            var pTable = d3.select('#p_vectors tbody');
            var cols = ['x','y','z'];

            var rows = pTable.selectAll('tr')
                .data(data);

            rows.enter().append('tr');

            var cells = rows.selectAll('td')
                .data(function(v){
                    return cols.map(function(c) { return v[c]; });
                });

            cells.enter().append('td');
            cells.text(function(d) { return d.toFixed(4); });
            cells.exit().remove();
        },

        render: function (actual, orthogonal, normed) {
            var vis = this,
            vector_groups = [actual, orthogonal, normed];
            this.update_table(normed);
            vector_groups.forEach(function(vg, i) {
                vg.forEach(function(v, j) {
                    vis.vector_groups[i][j].vertices[1] = toThreeVec(v);
                    vis.vector_groups[i][j].verticesNeedUpdate = true;
                });
            });
            this.renderer.render(this.scene, this.camera);
        }
};
vectorVis.init('#vector_canvas');
vectorVis.render(u, p, p_norm);

// visualise the lorenz equations
var lorenzVis = {
    zoomLevel: 60,
    updateDistanceThreshold: 0.4,
    vertexLimit: 2000,

    scene: new THREE.Scene(),
    renderer: new THREE.CanvasRenderer(),

    init: function(canvas, x0) {
        var vis = this;
        var c = $(canvas);
        this.width = c.width();
        this.height = c.height();
        this.renderer = new THREE.CanvasRenderer({canvas: c.get(0)});
        this.renderer.setSize(this.width, this.height);

        this.camera = new THREE.PerspectiveCamera(50, this.width/this.height, 0.1, 1000);
        this.camera.setLens(this.zoomLevel);
        this.camera.position.set(0, 100, -27);
        this.camera.lookAt(new THREE.Vector3(0, 0, 27));
        this.last_pos = x0;

        c.on('mousedown', function(e) {
            e.preventDefault();

        })

    },

    render: function(x) {
        if (this.last_pos.dist(x) > this.updateDistanceThreshold) {
            var x_1 = this.last_pos;
            var geo = new THREE.Geometry();
            var line = new THREE.Line(geo, material);
            geo.vertices.push(new THREE.Vector3(x_1.x, x_1.y, x_1.z));
            geo.vertices.push(new THREE.Vector3(x.x, x.y, x.z));
            this.last_pos = x;
            this.scene.add(line);
            if (this.scene.children.length > this.vertexLimit) {
                // remove oldest vertices
                this.scene.children.splice(0, 1);
            };
            this.renderer.render(this.scene, this.camera);
        }
    },
};
lorenzVis.init('#lorenz', x0);
lorenzVis.render(x);


// start-stop
var pid;
function start(speed) {
    var speed = speed || 1000 / 60;
    stop(pid);
    pid = setInterval( function () {
        stats.begin();
        run();
        stats.end();
    }, speed );
}

function stop(){
    clearInterval(pid);
}




// Show FPS statistics box
var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms

// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '800px';
stats.domElement.style.top = '0px';

document.body.appendChild( stats.domElement );
