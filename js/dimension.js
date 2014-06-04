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




var sigma = 10,
    r = 28,
    b = 8 / 3;

var std_lorenz = make_lorenz(sigma, r, b),
    std_jac = make_lorenz_jacobian(sigma, r, b);

// Initial conditions
var x0 = new Vector(5.2, 8.5, 27.0),
    u0 = [new Vector(1,0,0),
          new Vector(0,1,0),
          new Vector(0,0,1)];

var t = 0,
    x = x0,
    x_1 = x0,
    u = u0,
    u_1 = u0,
    sums = [0,0,0],
    exponents = [0,0,0],
    h = 0.01;

function run() {
    t = t + h;
    var jac = std_jac(x);
    x_1 = x;
    u_1 = u.slice(0);

    // iterate the trajectory forward and calculate peturbations
    x = vectorRK4(x, h, std_lorenz);
    u = u.map(function(v) { return vectorRK4(v, h, jac); });

    orthogonal = gram_schmidt(u);
    orthonormal = gram_schmidt(u, true);
    vectorVis.render({'previous': u_1, 'current': u, 'orthogonal': orthogonal});
    u = orthonormal;

    lorenzVis.render(x);

    sums = sums.map(function(e, i) {
        return e + Math.log(orthogonal[i].length);
    });
    exponents = sums.map(function(e) { return e / t; });
    showExponents(exponents);
    updateOverview(t, t/h);
}

function showExponents(es) {
    d3.select('#exp_sum').text((es.reduce(function(x,y) {return x+y; })).toFixed(3));

    var td = d3.select('#exponent_table').selectAll('.exp').data(es);
    td.text(function(d) { return d.toFixed(2); });

    // calc kaplan yorke dim
    var cum_sum = [];
    es.reduce(function(a,b,i) { return cum_sum[i] = a+b; }, 0);
    var pos_sum = cum_sum.filter(function(x){return x > 0}),
        ky_dim = 0;
    if (pos_sum.length) {
        var k = pos_sum.length;
        ky_dim = k + (pos_sum[k-1] / Math.abs(es[k]));
    }
    $('#ky_dimension').text(ky_dim.toFixed(4));
}

function updateOverview(t, n) {
    $("#iteration").text(n.toFixed(0));
    $('#time').text(t.toFixed(2));
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
        styles: {
            'previous': new THREE.LineBasicMaterial({
                color: 0xE64C66,
                linewidth: 3,
                opacity: 0.5
            }),
            'current': new THREE.LineBasicMaterial({
                color: 0xE64C66,
                linewidth: 3,
            }),
            'orthogonal': new THREE.LineBasicMaterial({
                color: 0x1BBC9B,
                linewidth: 3,
                visible: false
            }),
        },

        init: function(canvas) {
            var vis = this;
            var c = $(canvas);
            this.renderer = new THREE.CanvasRenderer({canvas: c.get(0)});
            this.renderer.setSize(c.width(), c.height());

            this.camera.setLens(100);
            this.camera.position.set(0, 0, 10);
            this.camera.lookAt(new THREE.Vector3(0, 0, 0));

            // store three types of vectors
            this.vector_group_names = ['previous', 'current', 'orthogonal'];
            this.vector_groups = []
            this.vector_group_names.forEach(function (s) {
                var vectors = [1,2,3].map(function() {
                    var geo = new THREE.Geometry();
                    var line = new THREE.Line(geo, vis.styles[s]);
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
            var cols = ['x','y','z', 'length'];

            var rows = pTable.selectAll('tr')
                .data(data);

            rows.enter().append('tr');

            var cells = rows.selectAll('td')
                .data(function(v){
                    return cols.map(function(c) { return v[c]; });
                });

            cells.enter().append('td');
            cells.text(function(d) { return d.toFixed(2); });
            cells.exit().remove();
        },

        render: function (data) {
            var vis = this;
            if (data) this.data = data;
            this.update_table(this.data.orthogonal);
            this.vector_group_names.forEach(function(vg, i) {
                vis.data[vg].forEach(function(v, j) {
                    vis.vector_groups[i][j].vertices[1] = toThreeVec(v);
                    vis.vector_groups[i][j].verticesNeedUpdate = true;
                });
            });
            this.renderer.render(this.scene, this.camera);
        }
};
vectorVis.init('#vector_canvas');
vectorVis.render({'previous': u_1, 'current': u, 'orthogonal': u});

// visualise the lorenz equations
var lorenzVis = {
    shouldRender: true,
    zoomLevel: 65,
    updateDistanceThreshold: 0.4,
    vertexLimit: 1500,
    lineStyle: new THREE.LineBasicMaterial({
        color: 0xAEAEAE,
        linewidth: 2,
        opacity: 0.7,
        linejoin: "bevel",
        linecap: "butt",
    }),

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
        this.camera.position.set(0, 100, 0);
        this.last_pos = x0;

		this.controls = new THREE.TrackballControls(this.camera, c.get(0));
        this.controls.target = new THREE.Vector3(0,0,27);
		this.controls.rotateSpeed = 1.0;

		this.controls.noPan = true;

	//	this.controls.staticMoving = true;
		this.controls.dynamicDampingFactor = 0.3;
		this.controls.keys = [ 65, 83, 68 ];
    },

    render: function(x) {
        if (this.last_pos.dist(x) > this.updateDistanceThreshold) {
            var x_1 = this.last_pos;
            var geo = new THREE.Geometry();
            var line = new THREE.Line(geo, this.lineStyle);
            geo.vertices.push(new THREE.Vector3(x_1.x, x_1.y, x_1.z));
            geo.vertices.push(new THREE.Vector3(x.x, x.y, x.z));
            this.last_pos = x;
            this.scene.add(line);
            if (this.scene.children.length > this.vertexLimit) {
                // remove oldest vertices
                this.scene.children.splice(0, 1);
            };
            if (this.shouldRender) {
                this.controls.update();
                this.renderer.render(this.scene, this.camera);
            };
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
    }, speed);
}

function stop(){
    clearInterval(pid);
}



// Bind to controls
$('#start_button').click(function(e){
    e.preventDefault();
    if (this.textContent == 'Start') {
        start();
        this.textContent = 'Stop';
    } else {
        stop();
        this.textContent = 'Start';
    }
});

$('#step_button').click(function(e){
    e.preventDefault();
    run();
});

$('.vector_toggle').change(function(e){
    vectorVis.styles[this.name].visible = this.checked;
    vectorVis.render();
});
$('#show_vis').change(function(e){
    lorenzVis.shouldRender = this.checked;
    $('#lorenz').toggle(this.checked);
});


// Show FPS statistics box
var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms

// Align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '800px';
stats.domElement.style.top = '0px';

document.body.appendChild(stats.domElement);
