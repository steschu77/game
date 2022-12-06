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

      uniform mat4 uMatrix;

      varying lowp vec4 vColor;

      void main() {
        gl_Position = uMatrix * aVertex;
        vColor = aColor;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec4 uColor;
      varying lowp vec4 vColor;
      void main(void) {
        gl_FragColor = vColor;
      }
    `;

    let shaderProgram = this.initShaderProgram(vsSource, fsSource);

    this.defaultProgram = {
      program: shaderProgram,
      attribLocations: {
        vertex: gl.getAttribLocation(shaderProgram, 'aVertex'),
        color: gl.getAttribLocation(shaderProgram, 'aColor'),
      },
      uniformLocations: {
        matrix: gl.getUniformLocation(shaderProgram, 'uMatrix'),
        color: gl.getUniformLocation(shaderProgram, 'uColor'),
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

    this.projectionMatrix = this.setupProjection(gl.canvas);
    this.inverseProjection = this.invertProjection(this.projectionMatrix);

    this.cameraPosition = { u0: 0, u1: 0 };
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

    gl.drawArrays(gl.TRIANGLES, 0, chunks.numPoints);
  }
}
