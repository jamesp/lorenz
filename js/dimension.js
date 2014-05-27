var WIDTH = window.innerWidth * 0.8,
    HEIGHT = window.innerHeight * 0.99,
    maxVertices = 50000;


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
    },
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


// def extended_lorenz(xu, sigma=10.0, r=28.0, b=8.0/3.0):
//     """Extended Lorenz system includes the linearised equations.
//     Given a 4 vector list `xu`, where row 1 is the position in
//     phase space and rows 2-4 are 3 perturbation vectors.
//     Returns 4 vector list of the same format for the new position."""
//     xyz, u = unaugment_position(xu)
//     x,y,z = xyz
//     xyz_ = lorenz(xyz, sigma, r, b)
//     u_ = []
//     for dx, dy, dz in u:
//         dxdot = -sigma*dx + sigma*dy
//         dydot = (r - z) * dx - dy - x * dz
//         dzdot = y * dx + x * dy - b * dz
//         u_.append([dxdot, dydot, dzdot])
//     return augment_position(xyz_, u_)

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



function update_vectors(data) {
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
    new Vector(0,0,1)
];

var x = x0,
    p = peturb,
    h = 0.01;

function run() {
    var jac = std_jac(x);
    x = vectorRK4(x, h, std_lorenz);
    p = p.map(function(v) { return vectorRK4(v, h, jac); });
    p = gram_schmidt(p);
    update_vectors(p);
}


update_vectors(peturb);
