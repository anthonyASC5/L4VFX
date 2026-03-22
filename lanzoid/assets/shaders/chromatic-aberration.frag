uniform sampler2D tDiffuse;
uniform float amount;
uniform float enabledMix;
uniform vec2 resolution;

varying vec2 vUv;

void main() {
  vec2 direction = vec2(amount, 0.0);
  vec4 baseSample = texture2D(tDiffuse, vUv);
  vec4 shiftedSample = vec4(
    texture2D(tDiffuse, vUv + direction).r,
    baseSample.g,
    texture2D(tDiffuse, vUv - direction).b,
    baseSample.a
  );

  gl_FragColor = mix(baseSample, shiftedSample, enabledMix);
}
