<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DSRT.js WebGL Starter</title>
<style>
  body, html { margin:0; padding:0; overflow:hidden; background:black; }
  canvas { display:block; width:100%; height:100%; }
</style>
</head>
<body>
<canvas id="dsrtCanvas"></canvas>
<script>
// ===== DSRT.js WebGL Minimal =====

const canvas = document.getElementById('dsrtCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const gl = canvas.getContext('webgl2');
if(!gl) alert("WebGL2 not supported");

// ---------- Shader Utilities ----------
function createShader(gl,type,source){
  const shader = gl.createShader(type);
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function createProgram(gl,vShader,fShader){
  const program = gl.createProgram();
  gl.attachShader(program,vShader);
  gl.attachShader(program,fShader);
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

// ---------- Shaders ----------
const vertexShaderSrc = `#version 300 es
in vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
void main(){
  gl_Position = uProjection * uView * uModel * vec4(aPosition,1.0);
}
`;

const fragmentShaderSrc = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;
void main(){
  outColor = vec4(uColor,1.0);
}
`;

const vShader = createShader(gl,gl.VERTEX_SHADER,vertexShaderSrc);
const fShader = createShader(gl,gl.FRAGMENT_SHADER,fragmentShaderSrc);
const program = createProgram(gl,vShader,fShader);

// ---------- Math Utilities ----------
function mat4_identity(){ return new Float32Array([
  1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
]);}

function mat4_perspective(fov,aspect,near,far){
  const f = 1/Math.tan(fov*Math.PI/180/2);
  const nf = 1/(near-far);
  const out = new Float32Array(16);
  out[0]=f/aspect; out[1]=0; out[2]=0; out[3]=0;
  out[4]=0; out[5]=f; out[6]=0; out[7]=0;
  out[8]=0; out[9]=0; out[10]=(far+near)*nf; out[11]=-1;
  out[12]=0; out[13]=0; out[14]=2*far*near*nf; out[15]=0;
  return out;
}

function mat4_lookAt(eye,center,up){
  const [ex,ey,ez]=eye;
  const [cx,cy,cz]=center;
  let zx=ex-cx, zy=ey-cy, zz=ez-cz;
  let len=Math.hypot(zx,zy,zz); zx/=len; zy/=len; zz/=len;
  let xx = up[1]*zz - up[2]*zy;
  let xy = up[2]*zx - up[0]*zz;
  let xz = up[0]*zy - up[1]*zx;
  len=Math.hypot(xx,xy,xz); xx/=len; xy/=len; xz/=len;
  let yx = zy*xz - zz*xy;
  let yy = zz*xx - zx*xz;
  let yz = zx*xy - zy*xx;
  const out = new Float32Array(16);
  out[0]=xx; out[1]=yx; out[2]=zx; out[3]=0;
  out[4]=xy; out[5]=yy; out[6]=zy; out[7]=0;
  out[8]=xz; out[9]=yz; out[10]=zz; out[11]=0;
  out[12]=-(xx*ex + xy*ey + xz*ez);
  out[13]=-(yx*ex + yy*ey + yz*ez);
  out[14]=-(zx*ex + zy*ey + zz*ez);
  out[15]=1;
  return out;
}

function mat4_translate(m,v){
  const out = m.slice();
  out[12] += v[0]; out[13] += v[1]; out[14] += v[2];
  return out;
}

function mat4_rotateY(m,rad){
  const c=Math.cos(rad), s=Math.sin(rad);
  const out = m.slice();
  out[0]=m[0]*c + m[8]*s;
  out[2]=m[0]*(-s) + m[8]*c;
  out[8]=m[2]*c + m[10]*s;
  out[10]=m[2]*(-s)+m[10]*c;
  out[4]=m[4]*c + m[12]*s;
  out[6]=m[4]*(-s)+m[12]*c;
  out[12]=m[4]*s + m[12]*c;
  return out;
}

// ---------- DSRTCamera ----------
class DSRTCamera {
  constructor(fov=60, aspect=1, near=0.1, far=1000){
    this.fov=fov; this.aspect=aspect; this.near=near; this.far=far;
    this.position=[0,0,5];
    this.target=[0,0,0];
    this.up=[0,1,0];
    this.viewMatrix = mat4_lookAt(this.position,this.target,this.up);
    this.projectionMatrix = mat4_perspective(fov,aspect,near,far);
  }
  lookAt(target){
    this.target = target;
    this.viewMatrix = mat4_lookAt(this.position,this.target,this.up);
  }
}

// ---------- DSRTScene ----------
class DSRTScene{
  constructor(){ this.objects=[]; }
  add(obj){ this.objects.push(obj); }
}

// ---------- DSRTMesh ----------
class DSRTMesh{
  constructor(vertices,color){
    this.vertices = vertices;
    this.color = color;
    this.modelMatrix = mat4_identity();

    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program,"aPosition");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);
    gl.bindVertexArray(null);
  }
}

// ---------- DSRTRenderer ----------
class DSRTRenderer{
  constructor(gl,scene,camera){
    this.gl = gl;
    this.scene = scene;
    this.camera = camera;
  }
  render(){
    const gl = this.gl;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0.05,0.05,0.1,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(program);
    const uModel = gl.getUniformLocation(program,"uModel");
    const uView = gl.getUniformLocation(program,"uView");
    const uProjection = gl.getUniformLocation(program,"uProjection");
    const uColor = gl.getUniformLocation(program,"uColor");

    gl.uniformMatrix4fv(uView,false,this.camera.viewMatrix);
    gl.uniformMatrix4fv(uProjection,false,this.camera.projectionMatrix);

    this.scene.objects.forEach(obj=>{
      gl.uniformMatrix4fv(uModel,false,obj.modelMatrix);
      gl.uniform3fv(uColor,obj.color);
      gl.bindVertexArray(obj.vao);
      gl.drawArrays(gl.TRIANGLES,0,obj.vertices.length/3);
      gl.bindVertexArray(null);
    });
  }
}

// ---------- Demo Cube (lanjutan) ----------
// Left
-0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5,
-0.5,-0.5,-0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5,
// Right
0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5,
0.5,-0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5,
// Top
-0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5,
-0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5,
// Bottom
-0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5,
-0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5
];

// ---------- Setup Scene ----------
const scene = new DSRTScene();
const camera = new DSRTCamera(60, canvas.width/canvas.height, 0.1, 1000);
const renderer = new DSRTRenderer(gl, scene, camera);

// Create cube mesh
const cube = new DSRTMesh(cubeVertices, [1.0, 0.8, 0.2]); // RGB warna kuning
scene.add(cube);

// ---------- Animation Loop ----------
function animate(time){
  // Rotate cube
  const rad = time * 0.001; // convert ms to seconds
  cube.modelMatrix = mat4_rotateY(mat4_identity(), rad);

  renderer.render();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
</script>
</body>
</html>
