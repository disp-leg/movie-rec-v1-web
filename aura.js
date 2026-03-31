/* Liquid Aura — single shared WebGL background */
(function() {
  var canvas = document.getElementById('aura-canvas');
  if (!canvas) return;
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  var vertSrc = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

  var fragSrc = [
    'precision mediump float;',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
    'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float snoise(vec3 v){',
    '  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    '  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;',
    '  vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;',
    '  i=mod289(i);',
    '  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    '  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;',
    '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;',
    '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}',
    'float fbm(vec3 p){float f=0.0;float amp=0.5;float freq=1.0;for(int i=0;i<3;i++){f+=amp*snoise(p*freq);freq*=2.0;amp*=0.5;}return f;}',
    'float warpedNoise(vec2 uv,float t){',
    '  vec3 p=vec3(uv,t);',
    '  float q1=fbm(p+vec3(1.7,9.2,0.0));float q2=fbm(p+vec3(8.3,2.8,0.0));',
    '  vec3 w1=p+vec3(q1,q2,0.0)*0.8;',
    '  float r1=fbm(w1+vec3(1.2,3.4,0.0)+t*0.04);float r2=fbm(w1+vec3(4.7,7.1,0.0)+t*0.03);',
    '  return fbm(w1+vec3(r1,r2,0.0)*0.6);',
    '}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/u_resolution;float aspect=u_resolution.x/u_resolution.y;',
    '  vec2 st=vec2(uv.x*aspect,uv.y);float t=u_time*0.06;',
    '  float n1=warpedNoise(st*1.2,t);float n2=warpedNoise(st*0.8+vec2(5.0,3.0),t*0.7);',
    '  float n3=snoise(vec3(st*2.5,t*0.15));float n4=snoise(vec3(st*0.5+vec2(10.0),t*0.1));',
    '  vec3 cream=vec3(0.85,0.82,0.78);vec3 richTeal=vec3(0.30,0.65,0.70);',
    '  vec3 richLav=vec3(0.55,0.40,0.75);vec3 dustyRose=vec3(0.78,0.45,0.50);',
    '  float w1=smoothstep(-0.4,0.6,n1);float w2=smoothstep(-0.2,0.8,n2);',
    '  float w3=smoothstep(0.0,1.0,n3*0.5+0.5);float w4=smoothstep(-0.3,0.5,n4);',
    '  vec3 color=cream;',
    '  color=mix(color,richTeal,w1*0.6);color=mix(color,richLav,w2*0.5);color=mix(color,dustyRose,w3*w4*0.4);',
    '  color+=snoise(vec3(st*4.0,t*0.2))*0.02;',
    '  float vig=1.0-length((uv-0.5)*1.1);vig=smoothstep(0.0,0.8,vig);',
    '  color*=mix(0.85,1.0,vig);color=clamp(color,0.3,0.95);',
    '  gl_FragColor=vec4(color,1.0);',
    '}'
  ].join('\n');

  function createShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  var vert = createShader(gl.VERTEX_SHADER, vertSrc);
  var frag = createShader(gl.FRAGMENT_SHADER, fragSrc);
  var program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.useProgram(program);

  var vertices = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(program, 'u_resolution');
  var uTime = gl.getUniformLocation(program, 'u_time');
  var start = performance.now();

  function render() {
    var t = (performance.now() - start) * 0.001;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
