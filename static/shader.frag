precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uWebcam;
uniform sampler2D uBackground;

vec3 rgbToCbCr(vec3 rgb) {
  float y = 0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b;
  float Cb = -0.168736*rgb.r - 0.331264*rgb.g + 0.5*rgb.b;
  float Cr = 0.5*rgb.r - 0.418688*rgb.g - 0.081312*rgb.b;
  return vec3(y,Cb,Cr);
}

float mixFactor(vec3 pixelColor, vec3 keyColor) {
  float toleranceA = 0.42;
  float toleranceB = 0.49;
  vec3 pixelYCbCr = rgbToCbCr(pixelColor);
  vec3 keyYCbCr = rgbToCbCr(keyColor);
  float diff = sqrt(pow((keyYCbCr.y - pixelYCbCr.y),2.0) + pow(keyYCbCr.z - pixelYCbCr.z,2.0));
  if(diff < toleranceA) {
    return 1.0;
  }
  else if(diff < toleranceB) {
    return 1.0 - (diff - toleranceA)/(toleranceB - toleranceA);
  }
  else return 0.0;
}
void main() {
  vec4 webcam = texture2D(uWebcam, vTextureCoord);
  vec4 background = texture2D(uBackground, vTextureCoord);

  float mixFactor = mixFactor(webcam.rgb, vec3(0.0, 1.0, 0.0));
  gl_FragColor = mix(webcam, background, mixFactor);
}