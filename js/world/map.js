// ----------------------------------------------------------------------------
class WorldMap {
  constructor(wgl) {

    this.wgl = wgl;
    this.map2d = new Uint8Array(32 * 32);

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
        this.map2d[32 * y + x] = data[(cx * y + x) * 4];
      }
    }

    img.remove();
  }

  getChunks(cameraPos) {

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

        points.push(px - 0.4);
        points.push(py - 0.4);
        txtres.push(0);
        txtres.push(0);

        points.push(px - 0.4);
        points.push(py + 0.4);
        txtres.push(0);
        txtres.push(1);

        points.push(px + 0.4);
        points.push(py - 0.4);
        txtres.push(1);
        txtres.push(0);

        points.push(px + 0.4);
        points.push(py - 0.4);
        txtres.push(1);
        txtres.push(0);

        points.push(px - 0.4);
        points.push(py + 0.4);
        txtres.push(0);
        txtres.push(1);

        points.push(px + 0.4);
        points.push(py + 0.4);
        txtres.push(1);
        txtres.push(1);
      }
    }

    return {
      shape: this.wgl.createBuffer(points),
      txtre: this.wgl.createBuffer(txtres),
      numPoints: points.length / 2
    };
  }

  getAt(cx, cy) {
    if (cx >= 0 && cx < 32 && cy >= 0 && cy < 32) {
      return this.map2d[32 * cy + cx];
    }
    return 0;
  }

}
