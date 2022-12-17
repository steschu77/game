// ----------------------------------------------------------------------------
function reportError(msg)
{
  let div = document.getElementById('canvas');
  div.innerHTML = "<p>" + msg + "</p>";
  div.className = "alert";
}

// ----------------------------------------------------------------------------
class WebGLRenderer
{
  constructor(canvas) {
    const gl = canvas.getContext("webgl");
    if (gl === null) {
      reportError("Your browser does not support WebGL.");
      return;
    }

    this.gl = gl;

    const vsSource = `
      attribute vec4 aVertex;
      attribute vec2 aTexCoord;

      uniform mat4 uMatrix;

      varying lowp vec2 vTexCoord;

      void main() {
        gl_Position = uMatrix * aVertex;
        vTexCoord = aTexCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D uSampler;
      varying lowp vec2 vTexCoord;
      void main(void) {
        vec4 texColor = texture2D(uSampler, vTexCoord);
        if (texColor.a < 0.1)
          discard;
        gl_FragColor = texColor;
      }
    `;

    let shaderProgram = this.initShaderProgram(vsSource, fsSource);

    this.defaultProgram = {
      program: shaderProgram,
      attribLocations: {
        vertex: gl.getAttribLocation(shaderProgram, 'aVertex'),
        texCoord: gl.getAttribLocation(shaderProgram, "aTexCoord"),
      },
      uniformLocations: {
        matrix: gl.getUniformLocation(shaderProgram, 'uMatrix'),
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
      },
    };

    const rectPoints = [ -1.0,-1.0, -1.0, 1.0,  1.0,-1.0,  1.0, -1.0, -1.0, 1.0,  1.0, 1.0 ];
    this.rectShape = {
      buffer: this.createBuffer(rectPoints),
      numPoints: rectPoints.length / 2
    };

    const triPoints = [ -1.0,  0.0,   0.0,  1.0,   1.0, 0.0 ];
    this.triShape = {
      buffer: this.createBuffer(triPoints),
      numPoints: triPoints.length / 2
    };

    const cursorPoints = [ 0.0,0.0,  0.0,1.0,  1.0,0.0,  1.0,0.0, 0.0,1.0,  1.0, 1.0 ];
    this.cursorShape = {
      buffer: this.createBuffer(cursorPoints),
      numPoints: cursorPoints.length / 2
    };

    const du = 32.0 / 256.0;
    const dv = 32.0 / 256.0;

    let texCoords = [];
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 8; i++) {
        texCoords.push(    i*du);
        texCoords.push(    j*dv);
        texCoords.push(    i*du);
        texCoords.push((j+1)*dv);
        texCoords.push((i+1)*du);
        texCoords.push(    j*dv);

        texCoords.push((i+1)*du);
        texCoords.push(    j*dv);
        texCoords.push(    i*du);
        texCoords.push((j+1)*dv);
        texCoords.push((i+1)*du);
        texCoords.push((j+1)*dv);
      }
    }
    this.texCoords = {
      buffer: this.createBuffer(texCoords),
    };

    this.projectionMatrix = this.setupProjection(gl.canvas);
    this.inverseProjection = this.invertProjection(this.projectionMatrix);

    this.cameraPosition = { u0: 0, u1: 0 };

    this.texTile = this.createTexture("img/free.png");
    this.texChar = this.createTexture("img/girl.png");
  }

  // --------------------------------------------------------------------------
  createBuffer(float32s)
  {
    const gl = this.gl;
    let buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(float32s), gl.STATIC_DRAW);
    return buffer;
  }

  // --------------------------------------------------------------------------
  createTexture(url)
  {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Create a 1x1 white dummy texture for immediate use. Will be replaced once
    // the actual image has been downloaded.
    const pix = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pix);

    const img = new Image();
    img.src = url;

    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };

    return texture;
  }

  // --------------------------------------------------------------------------
  loadShader(type, source)
  {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      reportError('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // --------------------------------------------------------------------------
  initShaderProgram(vsSource, fsSource)
  {
    const gl = this.gl;
    const vertexShader = this.loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      reportError('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
  }

  // --------------------------------------------------------------------------
  setupProjection(canvas)
  {
    const zoom = 8.0;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const left = -zoom * aspect;
    const right = zoom * aspect;
    const top = zoom;
    const bottom = -zoom;

    const projectionMatrix = glMatrix.mat4.create();
    glMatrix.mat4.ortho(projectionMatrix, left, right, bottom, top, -1.0, 1.0);

    return projectionMatrix;
  }

  // --------------------------------------------------------------------------
  invertProjection(projectionMatrix)
  {
    const inverseProjection = glMatrix.mat4.create();
    glMatrix.mat4.invert(inverseProjection, projectionMatrix);
    return inverseProjection;
  }


  // --------------------------------------------------------------------------
  setCamera(position)
  {
    this.cameraPosition = position;
  }

  // --------------------------------------------------------------------------
  screenToWorldCoords(pt)
  {
    const cameraPos = this.cameraPosition;
    const canvas = this.gl.canvas;

    let pt4 = glMatrix.vec4.create();
    pt4[0] = 2 * pt.u0 / canvas.clientWidth - 1;
    pt4[1] = 1 - 2 * pt.u1 / canvas.clientHeight;
    pt4[2] = 0;
    pt4[3] = 1;
    glMatrix.vec4.transformMat4(pt4, pt4, this.inverseProjection);

    return {
      u0: pt4[0] + cameraPos.u0,
      u1: pt4[1] + cameraPos.u1
    };
  }

  // --------------------------------------------------------------------------
  screenToWorldRatio(pt)
  {
    const canvas = this.gl.canvas;

    let pt4 = glMatrix.vec4.create();
    pt4[0] = -2 * pt.u0 / canvas.clientWidth;
    pt4[1] =  2 * pt.u1 / canvas.clientHeight;
    pt4[2] = 0;
    pt4[3] = 1;
    glMatrix.vec4.transformMat4(pt4, pt4, this.inverseProjection);

    return {
      u0: pt4[0],
      u1: pt4[1]
    };
  }

  // --------------------------------------------------------------------------
  drawScene(world, t_msec, player, cursor)
  {
    const gl = this.gl;
    const buffers = this.rectShape;
    const cameraPos = this.cameraPosition;

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const defaultProgram = this.defaultProgram;
    gl.useProgram(defaultProgram.program);

    // draw tiles
    gl.bindTexture(gl.TEXTURE_2D, this.texTile);
    gl.uniformMatrix4fv(
        defaultProgram.uniformLocations.matrix,
        false,
        this.projectionMatrix);

    let chunks = world.getChunks(cameraPos)
    gl.bindBuffer(gl.ARRAY_BUFFER, chunks.shape);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.vertex,
      2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.vertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, chunks.txtre);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.texCoord,
      2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.texCoord);

    gl.drawArrays(gl.TRIANGLES, 0, chunks.numPoints);

    // draw character
    const idx = ((t_msec / 128) & 7) + 8*player.dir;
    gl.bindTexture(gl.TEXTURE_2D, this.texChar);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectShape.buffer);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.vertex,
      2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.vertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords.buffer);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.texCoord,
      2, gl.FLOAT, false, 0, 48*idx);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.texCoord);

    gl.uniformMatrix4fv(
        defaultProgram.uniformLocations.matrix,
        false,
        this.projectionMatrix);

    const pos = player.pos;
    const bodyMatrix = glMatrix.mat4.create();
    glMatrix.mat4.fromTranslation(bodyMatrix, [pos.u0, pos.u1, 0.0]);
    glMatrix.mat4.mul(bodyMatrix, this.projectionMatrix, bodyMatrix);

    gl.uniformMatrix4fv(
        defaultProgram.uniformLocations.matrix,
        false,
        bodyMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, this.rectShape.numPoints);

    // draw cursor
    {
      const cx = Math.floor(cursor.u0) - cameraPos.u0;
      const cy = Math.floor(cursor.u1) - cameraPos.u1;

      gl.bindTexture(gl.TEXTURE_2D, this.texChar);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.cursorShape.buffer);
      gl.vertexAttribPointer(
        defaultProgram.attribLocations.vertex,
        2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(
        defaultProgram.attribLocations.vertex);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords.buffer);
      gl.vertexAttribPointer(
        defaultProgram.attribLocations.texCoord,
        2, gl.FLOAT, false, 0, 16*48);
      gl.enableVertexAttribArray(
        defaultProgram.attribLocations.texCoord);

      gl.uniformMatrix4fv(
          defaultProgram.uniformLocations.matrix,
          false,
          this.projectionMatrix);

      const bodyMatrix = glMatrix.mat4.create();
      glMatrix.mat4.fromTranslation(bodyMatrix, [cx, cy, 0.0]);
      glMatrix.mat4.mul(bodyMatrix, this.projectionMatrix, bodyMatrix);

      gl.uniformMatrix4fv(
          defaultProgram.uniformLocations.matrix,
          false,
          bodyMatrix);
      gl.drawArrays(gl.TRIANGLES, 0, this.cursorShape.numPoints);
    }
  }

}
