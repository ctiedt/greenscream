import { mat4 } from 'gl-matrix';

function getOnFileSelectedForId(id: string): (event: any) => any {
  return function onFileSelected(event) {
    var selectedFile = event.target.files[0];
    var reader = new FileReader();

    var imgtag: HTMLImageElement = document.querySelector(id);

    reader.onload = function(event) {
      imgtag.src = event.target.result.toString();
    };
    reader.readAsDataURL(selectedFile);
  }
}

function setupRenderingContext(gl: WebGL2RenderingContext) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function getProgramInfo(gl: WebGL2RenderingContext, shaderProgram:WebGLProgram) {
  return {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
      uWebcam: gl.getUniformLocation(shaderProgram, 'uWebcam'),
      uBackground: gl.getUniformLocation(shaderProgram, 'uBackground'),
      uMirror: gl.getUniformLocation(shaderProgram, 'uMirror'),
    },
  };
}

export function main() {
  const canvas: HTMLCanvasElement = document.querySelector('#glCanvas');
  const gl = canvas.getContext('webgl2');
  if (gl === null) {
    alert('Couldn\'t get context');
    return;
  }
  setupRenderingContext(gl);
  
  const video: HTMLVideoElement = document.querySelector('#webcam');
  const constraints = { video: { width: canvas.width, height: canvas.height }, audio: false };
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
  });  

  const background: HTMLImageElement = document.querySelector('#background');
  const backgroundSelector: HTMLInputElement = document.querySelector('#file');
  backgroundSelector.onchange = getOnFileSelectedForId('#background');

  const foregroundTexture = initTexture(gl);
  const backgroundTexture = initTexture(gl);

  // Shaders are loaded via the webpack-glsl-loader module
  const vsSource = require('../static/shader.vert');
  const fsSource = require('../static/shader.frag');

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const programInfo = getProgramInfo(gl, shaderProgram);
  const buffers = initBuffers(gl);

  setupTexturePlane(gl, programInfo, buffers);

  let then = 0;
  function render(now: number) {
    now *= 0.001;
    const delta = now - then;
    then = now;

    updateTexture(gl, foregroundTexture, video);
    updateTexture(gl, backgroundTexture, background);

    drawScene(gl, programInfo, buffers, foregroundTexture, backgroundTexture, delta);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// Creates a WebGL Program with our vertex and fragment shaders
function initShaderProgram(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vs);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fs);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Failed to link shader program!');
    return null;
  }

  return shaderProgram;
}

function loadShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('Failed to compile shader! Error: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * initializes corner positions of the canvas and corresponding texture coordinates
 */
function initBuffers(gl: WebGL2RenderingContext) {
  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  const aspect = gl.canvas.width / gl.canvas.height;
  const halfHeight = 6;
  const halfWidth = halfHeight * aspect;
  const positions = [
    -halfWidth, halfHeight,
    halfWidth, halfHeight,
    -halfWidth, -halfHeight,
    halfWidth, -halfHeight,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const textureCoordBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

  const textureCoords = [
    0.0, 0.0,
    1.0, 0.0,
    0.0, 1.0,
    1.0, 1.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

  return { position: positionBuffer, textureCoord: textureCoordBuffer };
}

function setupTexturePlane(gl: WebGL2RenderingContext, programInfo, buffers) {
  const numComponents = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;

  // Create texture plane
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  // Add corresponding texture coordinates
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, numComponents, type, normalize, stride, offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
}

/**
 * 
 * @returns [projectionMatrix, modelViewMatrix]
 */
function setupCamera(gl: WebGL2RenderingContext): [mat4, mat4] {
  // TODO: replace magic numbers
  const fieldOfView = Math.atan(1) * 2;
  const aspect = gl.canvas.width / gl.canvas.height;
  const zNear = 0.1;
  const zFar = 100;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();
  const cameraDistance = 6;
  mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -cameraDistance]);

  return [projectionMatrix, modelViewMatrix];
}
function drawScene(gl: WebGL2RenderingContext, programInfo, buffers, foregroundTexture: WebGLTexture, backgroundTexture: WebGLTexture, delta) {
  gl.useProgram(programInfo.program);

  const mirror: HTMLInputElement = document.querySelector('#mirror');
  const orientation = mirror.checked ? -1 : 1;
  gl.uniform1f(programInfo.uniformLocations.uMirror, orientation);

  const [projectionMatrix, modelViewMatrix] = setupCamera(gl);
  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, foregroundTexture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);

  gl.uniform1i(programInfo.uniformLocations.uWebcam, 0);
  gl.uniform1i(programInfo.uniformLocations.uBackground, 1);

  const offset = 0;
  const vertexCount = 4;
  gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
}

// Initializes the webcam texture
function initTexture(gl: WebGL2RenderingContext) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  return texture;
}

// Updates the specified texture with the current frame
function updateTexture(gl: WebGL2RenderingContext, texture: WebGLTexture, video: HTMLVideoElement | HTMLImageElement) {
  const level = 0;
  const internalFormat = gl.RGBA;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, video);
}