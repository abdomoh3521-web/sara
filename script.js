const loadingScreen = document.getElementById('loadingScreen');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const joyButton = document.getElementById('joyButton');
const messageButton = document.getElementById('messageButton');
const messageModal = document.getElementById('messageModal');
const closeModal = document.getElementById('closeModal');
const muteButton = document.getElementById('muteButton');
const musicToggle = document.getElementById('musicToggle');
const volumeSlider = document.getElementById('volumeSlider');
const volumeLabel = document.getElementById('volumeLabel');
const musicStatus = document.getElementById('musicStatus');
const musicProgress = document.getElementById('musicProgress');
const friendshipSection = document.getElementById('friendshipSection');
const pageRoot = document.getElementById('pageRoot');
const observerTargets = document.querySelectorAll('.section');
let soundEnabled = true;
let audioContext;
let masterGain;
let ambientGain;
let musicGain;
let musicNodes = [];
let musicPlaying = false;
let musicStartTime = 0;
let musicLoopDuration = 16;
let musicProgressFrame = null;
const heartNormalColor = getComputedStyle(document.documentElement).getPropertyValue('--heart-base').trim() || '#ff86d9';
const heartNormalEmissive = getComputedStyle(document.documentElement).getPropertyValue('--heart-glow').trim() || '#7c4bc5';
const heartDiamondColor = getComputedStyle(document.documentElement).getPropertyValue('--heart-diamond').trim() || '#a8f0ff';
const heartDiamondEmissive = getComputedStyle(document.documentElement).getPropertyValue('--heart-diamond-glow').trim() || '#a4f3ff';

const canvas = document.getElementById('webglCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#0b0418', 0.015);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1600);
camera.position.set(0, 1.3, 8);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffb4f4, 1.45, 180, 2);
pointLight.position.set(-2, 2.5, 3.5);
scene.add(pointLight);

const pointHelper = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffc7e9 })
);
pointHelper.position.copy(pointLight.position);
pointHelper.material.transparent = true;
pointHelper.material.opacity = 0.75;
scene.add(pointHelper);

const heartGroup = new THREE.Group();
const orbGroup = new THREE.Group();
scene.add(heartGroup, orbGroup);

const particles = createParticleField(500);
scene.add(particles);

const floatingHearts = [];
createWorld();

let targetMouse = new THREE.Vector2(0, 0);
let currentMouse = new THREE.Vector2(0, 0);
let scrollTarget = 0;
let cameraBaseZ = 8;
let cameraBaseY = 1.3;
let lastTime = 0;
let isReady = false;

function createWorld() {
  for (let i = 0; i < 12; i++) {
    const heart = createHeartMesh();
    heart.position.set((Math.random() - 0.5) * 7, Math.random() * 3.5 - 0.5, -Math.random() * 10);
    heart.rotation.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * 0.4);
    heart.scale.setScalar(0.85 + Math.random() * 0.5);
    heart.userData.speed = 0.002 + Math.random() * 0.007;
    heartGroup.add(heart);
  }

  for (let i = 0; i < 14; i++) {
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 18, 18),
      new THREE.MeshStandardMaterial({
        color: 0xd2a4ff,
        transparent: true,
        opacity: 0.72,
        emissive: 0xd574ff,
        roughness: 0.25,
        metalness: 0.05,
      })
    );
    orb.position.set((Math.random() - 0.5) * 10, Math.random() * 4.5 + 0.5, -Math.random() * 12);
    orb.userData.float = Math.random() * Math.PI * 2;
    orbGroup.add(orb);
  }

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(12, 64),
    new THREE.MeshStandardMaterial({
      color: '#0f0722',
      roughness: 0.95,
      metalness: 0.1,
      opacity: 0.45,
      transparent: true,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.7;
  scene.add(ground);
}

function createHeartMesh() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.8);
  shape.bezierCurveTo(0, 1.5, -1.3, 1.5, -1.3, 0.6);
  shape.bezierCurveTo(-1.3, -0.4, 0, -0.4, 0, -1.1);
  shape.bezierCurveTo(0, -0.4, 1.3, -0.4, 1.3, 0.6);
  shape.bezierCurveTo(1.3, 1.5, 0, 1.5, 0, 0.8);

  const extrude = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 0.2, bevelThickness: 0.16 });
  extrude.center();

  const material = new THREE.MeshStandardMaterial({
    color: heartNormalColor,
    emissive: heartNormalEmissive,
    roughness: 0.3,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(extrude, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function createParticleField(amount) {
  const positions = new Float32Array(amount * 3);
  const color = new Float32Array(amount * 3);
  for (let i = 0; i < amount; i++) {
    const radius = Math.random() * 13 + 1;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius * (0.7 + Math.random() * 0.3);
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = -Math.random() * 16;
    color[i * 3] = 1.0;
    color[i * 3 + 1] = 0.82 + Math.random() * 0.14;
    color[i * 3 + 2] = 0.94 + Math.random() * 0.06;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
}

function updatePositions(delta) {
  heartGroup.children.forEach((heart, index) => {
    heart.rotation.x += 0.0012 + index * 0.00018;
    heart.rotation.y += 0.001 + index * 0.00013;
    heart.position.y += Math.sin(performance.now() * 0.0008 + index) * 0.0008;
  });

  orbGroup.children.forEach((orb, index) => {
    orb.userData.float += delta * 0.8;
    orb.position.y += Math.sin(orb.userData.float) * 0.003;
    orb.position.x += Math.cos(orb.userData.float * 0.7) * 0.001;
  });

  particles.rotation.y += delta * 0.01;
}

function lerp(value, target, speed) {
  return value + (target - value) * speed;
}

function onPointerMove(event) {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = (event.clientY / window.innerHeight) * 2 - 1;
  targetMouse.set(x, y);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function animate(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.03);
  lastTime = time;

  currentMouse.x = lerp(currentMouse.x, targetMouse.x, 0.08);
  currentMouse.y = lerp(currentMouse.y, targetMouse.y, 0.08);

  const desiredX = currentMouse.x * 0.9;
  const desiredY = currentMouse.y * 0.55;
  camera.position.x = lerp(camera.position.x, desiredX, 0.06);
  camera.position.y = lerp(camera.position.y, cameraBaseY + desiredY, 0.06);

  const targetZ = cameraBaseZ + scrollTarget * 8;
  camera.position.z = lerp(camera.position.z, targetZ, 0.06);

  camera.lookAt(0, 0.5, -4);
  camera.rotation.z = currentMouse.x * 0.04;

  pointLight.position.x = lerp(pointLight.position.x, desiredX * 2.5, 0.06);
  pointLight.position.y = lerp(pointLight.position.y, 2.4 + desiredY * 0.5, 0.06);
  pointHelper.position.copy(pointLight.position);

  updatePositions(delta);
  animateFloatingHearts(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function startExperience() {
  loadingScreen.classList.remove('active');
  isReady = true;
  document.body.style.overflow = 'auto';
  requestAnimationFrame(animate);
}

function simulateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 12 + 8;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => {
        progressFill.style.width = '100%';
        progressLabel.textContent = '100%';
        startExperience();
      }, 350);
    }
    progressFill.style.width = `${progress}%`;
    progressLabel.textContent = `${Math.floor(progress)}%`;
  }, 220);
}

function createClickSound() {
  if (!audioContext) initializeAudio();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 460;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ambientGain);
  const now = audioContext.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.18);
  osc.frequency.exponentialRampToValueAtTime(860, now + 0.14);
  osc.start(now);
  osc.stop(now + 0.2);
}

function createPopSound() {
  if (!audioContext) initializeAudio();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.value = 280;
  osc.connect(gain);
  gain.connect(ambientGain);
  const now = audioContext.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.2);
  osc.frequency.exponentialRampToValueAtTime(460, now + 0.16);
  osc.start(now);
  osc.stop(now + 0.24);
}

function initializeAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = soundEnabled ? 0.9 : 0;
  masterGain.connect(audioContext.destination);

  ambientGain = audioContext.createGain();
  ambientGain.gain.value = 0.12;
  ambientGain.connect(masterGain);

  musicGain = audioContext.createGain();
  musicGain.gain.value = Number(volumeSlider.value) / 100 * 0.5;
  musicGain.connect(masterGain);

  const drone = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  drone.type = 'sine';
  drone.frequency.value = 108;
  drone.connect(droneGain);
  droneGain.gain.value = 0.04;
  droneGain.connect(ambientGain);
  drone.start();
}

function createMusicTrack() {
  const now = audioContext.currentTime;
  const tones = [
    { freq: 130.81, type: 'sawtooth', gain: 0.02 },
    { freq: 164.81, type: 'triangle', gain: 0.018 },
    { freq: 196.0, type: 'sine', gain: 0.015 },
  ];

  tones.forEach((tone) => {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    gainNode.gain.value = tone.gain;
    osc.connect(gainNode);
    gainNode.connect(musicGain);
    osc.start(now);
    musicNodes.push({ osc, gainNode });
  });

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 20;
  lfo.connect(lfoGain);
  lfoGain.connect(musicNodes[0].osc.frequency);
  lfo.start(now);
  musicNodes.push({ osc: lfo, gainNode: lfoGain });
}

function startMusic() {
  if (!audioContext) initializeAudio();
  if (audioContext.state === 'suspended') audioContext.resume();
  if (musicPlaying) return;
  musicPlaying = true;
  musicToggle.textContent = '⏸️';
  createMusicTrack();
  musicStartTime = audioContext.currentTime;
  updateMusicStatus();
  updateMusicProgress();
}

function stopMusic() {
  if (!musicPlaying) return;
  musicPlaying = false;
  musicToggle.textContent = '▶️';
  updateMusicStatus();
  if (musicProgressFrame) cancelAnimationFrame(musicProgressFrame);
  musicNodes.forEach((entry) => {
    if (entry.osc) {
      entry.osc.stop?.();
      entry.osc.disconnect?.();
    }
    if (entry.gainNode) entry.gainNode.disconnect?.();
  });
  musicNodes = [];
}

function updateMusicProgress() {
  if (!musicPlaying || !audioContext) return;
  const elapsed = (audioContext.currentTime - musicStartTime) % musicLoopDuration;
  const progress = (elapsed / musicLoopDuration) * 100;
  musicProgress.style.width = `${progress}%`;
  musicProgress.parentElement?.setAttribute('aria-valuenow', String(Math.floor(progress)));
  musicProgressFrame = requestAnimationFrame(updateMusicProgress);
}

function updateMusicStatus() {
  if (!musicStatus) return;
  musicStatus.textContent = musicPlaying ? 'تشغيل' : 'موقوف';
  musicToggle.setAttribute('aria-pressed', musicPlaying ? 'true' : 'false');
}

function updateVolumeLabel() {
  if (!volumeLabel) return;
  volumeLabel.textContent = `${volumeSlider.value}%`;
}

function toggleMusic() {
  if (!audioContext) initializeAudio();
  if (!musicPlaying) {
    startMusic();
  } else {
    stopMusic();
  }
}

function toggleSound() {
  if (!audioContext) initializeAudio();
  soundEnabled = !soundEnabled;
  muteButton.textContent = soundEnabled ? '🔊' : '🔇';
  masterGain.gain.setTargetAtTime(soundEnabled ? 0.9 : 0, audioContext.currentTime, 0.1);
}

function setHeartTheme(isDiamond) {
  heartGroup.children.forEach((heart) => {
    heart.material.color.set(isDiamond ? heartDiamondColor : heartNormalColor);
    heart.material.emissive.set(isDiamond ? heartDiamondEmissive : heartNormalEmissive);
  });
  orbGroup.children.forEach((orb) => {
    orb.material.color.set(isDiamond ? 0xaef4ff : 0xd2a4ff);
    orb.material.emissive.set(isDiamond ? 0xa8e8ff : 0xd574ff);
  });
  document.body.classList.toggle('diamond-mode', isDiamond);
}

function setupSectionObservers() {
  const friendshipObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        setHeartTheme(entry.isIntersecting);
      });
    },
    { threshold: 0.35 }
  );

  if (friendshipSection) friendshipObserver.observe(friendshipSection);
}

function launchHeartBurst() {
  for (let i = 0; i < 10; i++) {
    const heart = createHeartMesh();
    heart.scale.setScalar(0.34 + Math.random() * 0.25);
    heart.position.set((Math.random() - 0.5) * 1.2, 0.75, -1.2);
    heart.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.1 + Math.random() * 0.8, -1 - Math.random() * 0.3);
    floatingHearts.push(heart);
    scene.add(heart);
  }
  createPopSound();
}

function animateFloatingHearts(delta) {
  for (let i = floatingHearts.length - 1; i >= 0; i--) {
    const heart = floatingHearts[i];
    heart.position.addScaledVector(heart.userData.velocity, delta * 1.5);
    heart.rotation.x += 0.03;
    heart.rotation.y += 0.04;
    heart.material.opacity = Math.max(0, heart.material.opacity - delta * 0.25);
    if (heart.position.y > 6 || heart.material.opacity <= 0.01) {
      scene.remove(heart);
      floatingHearts.splice(i, 1);
    }
  }
}

function handleScroll() {
  const scrollY = window.scrollY;
  const fullHeight = document.body.scrollHeight - window.innerHeight;
  scrollTarget = scrollY / fullHeight;
}

function revealSections() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.18 }
  );
  observerTargets.forEach((section) => observer.observe(section));
}

function createScrollListeners() {
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onPointerMove);
  joyButton.addEventListener('click', () => {
    if (!isReady) return;
    if (soundEnabled) createClickSound();
    pageRoot.classList.add('shake');
    setTimeout(() => pageRoot.classList.remove('shake'), 380);
    launchHeartBurst();
  });
  messageButton.addEventListener('click', () => {
    if (!isReady) return;
    if (soundEnabled) createClickSound();
    messageModal.classList.add('open');
    messageModal.setAttribute('aria-hidden', 'false');
  });
  closeModal.addEventListener('click', () => {
    messageModal.classList.remove('open');
    messageModal.setAttribute('aria-hidden', 'true');
  });
  muteButton.addEventListener('click', () => toggleSound());
  musicToggle.addEventListener('click', () => toggleMusic());
  volumeSlider.addEventListener('input', () => {
    if (!audioContext) initializeAudio();
    musicGain.gain.value = Number(volumeSlider.value) / 100 * 0.5;
    updateVolumeLabel();
  });
  updateVolumeLabel();
  window.addEventListener('click', (event) => {
    if (event.target === messageModal) {
      messageModal.classList.remove('open');
      messageModal.setAttribute('aria-hidden', 'true');
    }
  });
}

function init() {
  document.body.style.overflow = 'hidden';
  simulateLoading();
  revealSections();
  setupSectionObservers();
  createScrollListeners();
}

window.addEventListener('load', init);
