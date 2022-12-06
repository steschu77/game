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
      attribute vec4 aColor;
      attribute vec2 aTexCoord;

      uniform mat4 uMatrix;

      varying lowp vec4 vColor;
      varying lowp vec2 vTexCoord;

      void main() {
        gl_Position = uMatrix * aVertex;
        vColor = aColor;
        vTexCoord = aTexCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec4 uColor;
      uniform sampler2D uSampler;
      varying lowp vec4 vColor;
      varying lowp vec2 vTexCoord;
      void main(void) {
        gl_FragColor = texture2D(uSampler, vTexCoord);;
      }
    `;

    let shaderProgram = this.initShaderProgram(vsSource, fsSource);

    this.defaultProgram = {
      program: shaderProgram,
      attribLocations: {
        vertex: gl.getAttribLocation(shaderProgram, 'aVertex'),
        color: gl.getAttribLocation(shaderProgram, 'aColor'),
        texCoord: gl.getAttribLocation(shaderProgram, "aTexCoord"),
      },
      uniformLocations: {
        matrix: gl.getUniformLocation(shaderProgram, 'uMatrix'),
        color: gl.getUniformLocation(shaderProgram, 'uColor'),
        uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
      },
    };

    const rectPoints = [ -0.5,  0.5,   0.5,  0.5,   0.5, -0.5,  -0.5, -0.5 ];
    this.rectShape = {
      buffer: this.createBuffer(rectPoints),
      numPoints: rectPoints.length / 2
    };

    const triPoints = [ -1.0,  0.0,   0.0,  1.0,   1.0, 0.0 ];
    this.triShape = {
      buffer: this.createBuffer(triPoints),
      numPoints: triPoints.length / 2
    };

    const texCoords = [ 0.0, 0.0,  1.0, 0.0,  1.0, 1.0,  1.0, 0.0,  1.0, 1.0,  0.0, 1.0 ];
    this.texCoords = {
      buffer: this.createBuffer(texCoords),
    };

    this.projectionMatrix = this.setupProjection(gl.canvas);
    this.inverseProjection = this.invertProjection(this.projectionMatrix);

    this.cameraPosition = { u0: 0, u1: 0 };

    this.tex = this.createTexture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TtSIVETuIOGSoThbELxylikWwUNoKrTqYXPoFTRqSFBdHwbXg4Mdi1cHFWVcHV0EQ/ABxdHJSdJES/5cUWsR4cNyPd/ced+8AoV5mqtkxDqiaZSRjUTGTXRUDrwiiCwKm0S8xU4+nFtPwHF/38PH1LsKzvM/9OXqVnMkAn0g8x3TDIt4gntm0dM77xCFWlBTic+Ixgy5I/Mh12eU3zgWHBZ4ZMtLJeeIQsVhoY7mNWdFQiaeIw4qqUb6QcVnhvMVZLVdZ8578hcGctpLiOs1hxLCEOBIQIaOKEsqwEKFVI8VEkvajHv4hx58gl0yuEhg5FlCBCsnxg//B727N/OSEmxSMAp0vtv0xAgR2gUbNtr+PbbtxAvifgSut5a/UgdlP0mstLXwE9G0DF9ctTd4DLneAwSddMiRH8tMU8nng/Yy+KQsM3AI9a25vzX2cPgBp6mr5Bjg4BEYLlL3u8e7u9t7+PdPs7wdwJnKm75aG0wAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+YMBgMEMzWo+qkAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAA7UlEQVRIx9VWSw6FIAwUwglgJXfRw8NddKVneIuXEMJnbCvk5XVFGum00w5VLUxbbaid5733vlfvo2MYIcBxbd+DdxFjGEqmxbUUPZ0LmNz0MsJySAZAuoapx00aUwEwBOBdbNbuXaxJ77GkxbWDxgopWm047x1oigpQJFvXzsIgTZFgnB6EBprGxdDvpYQzMMOlS6VIEPS4tnp2pyg5Z+l3TwVRqI80zqogsaRZC3YARasNArkClqY32eCdjq0YhOZ+lii5N2BNv+Yqto7SHIrkNOLc87jUPzu8anrRsSnBW88SiuJulbEy/Af7AKTPa0Ye0JlgAAAAAElFTkSuQmCC");
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
    const zoom = 10.0;
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
  drawScene(world)
  {
    const gl = this.gl;
    const buffers = this.rectShape;
    const cameraPos = this.cameraPosition;

    gl.clearColor(0.1, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const defaultProgram = this.defaultProgram;
    gl.useProgram(defaultProgram.program);

    gl.uniformMatrix4fv(
        defaultProgram.uniformLocations.matrix,
        false,
        this.projectionMatrix);

    gl.uniform4fv(
      defaultProgram.uniformLocations.color,
      [1.0, 1.0, 1.0, 1.0]);

    let chunks = world.getChunks(cameraPos)
    gl.bindBuffer(gl.ARRAY_BUFFER, chunks.shape);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.vertex,
      2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.vertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, chunks.color);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.color,
      4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, chunks.txtre);
    gl.vertexAttribPointer(
      defaultProgram.attribLocations.texCoord,
      2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(
      defaultProgram.attribLocations.texCoord);

    gl.drawArrays(gl.TRIANGLES, 0, chunks.numPoints);
  }
}
