import { Engine, Scene, PerspectiveCamera, BoxGeometry, Mesh, Renderer } from "myengine";

const engine = new Engine();
const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const box = new Mesh(new BoxGeometry(1, 1, 1), { color: "blue" });
scene.add(box);

const renderer = new Renderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function animate() {
  requestAnimationFrame(animate);
  box.rotation.x += 0.01;
  box.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
