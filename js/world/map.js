// ----------------------------------------------------------------------------
class WorldMap {
  constructor(wgl) {

    this.wgl = wgl;
    this.map2d = new Uint8Array(32 * 32);
    this.filter2d = new Uint8Array(32 * 32);

    let img = document.getElementById("map");

    const cx = img.offsetWidth;
    const cy = img.offsetHeight;

    let canvas = document.createElement("canvas");
    canvas.width = cx;
    canvas.height = cy;

    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    let map = ctx.getImageData(0, 0, cx, cy);
    let data = map.data;

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        this.map2d[32 * y + x] =
          data[(cx * y + x) * 4] === 0 ? 0 : 1;
      }
    }

    img.remove();

    this.filterMap();
  }

  filterMap() {
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {

        const x0 = this.map2d[32 * y + x];
        const x1 = (x < 32) ? this.map2d[32 * y + (x + 1)] : x0;
        const y0 = (y > 0)  ? this.map2d[32 * (y + 1) + x] : x0;
        const y1 = (y < 32) ? this.map2d[32 * (y + 1) + (x + 1)] : x0;

        const z = 1*x0 + 2*x1 + 4*y0 + 8*y1;

        this.filter2d[32 * y + x] = z;
      }
    }
  }

  getChunks(cameraPos) {

    const mat = [
      { u: 2, v: 6 }, // 0
      { u: 2, v: 2 },
      { u: 0, v: 2 },
      { u: 1, v: 2 },
      { u: 2, v: 0 }, // 4
      { u: 2, v: 1 },
      { u: 0, v: 6 },
      { u: 6, v: 0 },
      { u: 0, v: 0 }, // 8
      { u: 7, v: 1 },
      { u: 0, v: 1 },
      { u: 7, v: 0 },
      { u: 1, v: 0 }, // 12
      { u: 6, v: 1 },
      { u: 7, v: 1 },
      { u: 1, v: 1 },
      { u: 1, v: 2 }, // 16
      { u: 1, v: 1 },
    ];
    const du = 16.0/256.0;
    const dv = 16.0/256.0;

    const cx = Math.floor(cameraPos.u0);
    const cy = Math.floor(cameraPos.u1);
    const ox = cameraPos.u0 - cx;
    const oy = cameraPos.u1 - cy;

    let points = [];
    let txtres = [];
    for (let y = -12; y < 12; y+=1) {
      for (let x = -24; x < 24; x+=1) {
        const px = x - ox;
        const py = y - oy;

        const id = this.getFilterdAt(cx+x, cy+y);
        const u = mat[id].u * 16.0/256.0;
        const v = mat[id].v * 16.0/256.0;

        points.push(px - 0.5);
        points.push(py - 0.5);
        txtres.push(u);
        txtres.push(v);

        points.push(px - 0.5);
        points.push(py + 0.5);
        txtres.push(u);
        txtres.push(v+dv);

        points.push(px + 0.5);
        points.push(py - 0.5);
        txtres.push(u+du);
        txtres.push(v);

        points.push(px + 0.5);
        points.push(py - 0.5);
        txtres.push(u+du);
        txtres.push(v);

        points.push(px - 0.5);
        points.push(py + 0.5);
        txtres.push(u);
        txtres.push(v+dv);

        points.push(px + 0.5);
        points.push(py + 0.5);
        txtres.push(u+du);
        txtres.push(v+dv);
      }
    }

    return {
      shape: this.wgl.createBuffer(points),
      txtre: this.wgl.createBuffer(txtres),
      numPoints: points.length / 2
    };
  }

  getFilterdAt(cx, cy) {
    if (cx >= 0 && cx < 32 && cy >= 0 && cy < 32) {
      return this.filter2d[32 * cy + cx];
    }
    return 0;
  }

  getAt(cx, cy) {
    if (cx >= 0 && cx < 32 && cy >= 0 && cy < 32) {
      return this.map2d[32 * cy + cx];
    }
    return 0;
  }

  putAt(cx, cy, val) {
    if (cx >= 0 && cx < 32 && cy >= 0 && cy < 32) {
      this.map2d[32 * cy + cx] = val;
    }
    this.filterMap();
  }

}
