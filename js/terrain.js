const islandFile = "little_saint_james.glb";
const planeFile = "plane.glb";
const soldierFile = "TacticalSoldier.glb";
const loadingScreen = document.querySelector("#loading-screen");
const loadingText = document.querySelector("#loading-text");
const progressBar = document.querySelector("#progress-bar");
const modelFiles = document.querySelector("#model-files");

function createGameAudio() {
    const button = document.querySelector("#sound-button");
    const label = document.querySelector("#sound-state");
    const Audio = window.AudioContext || window.webkitAudioContext;
    const notes = {
        start: [330, 495, 660], ready: [740, 990],
        edge: [240, 240], miss: [350, 260, 175], win: [440, 554, 659, 880]
    };
    let enabled = true;
    try { enabled = localStorage.getItem("karunai.sound") !== "off"; } catch {}
    let context, master, engineGain, turbine, filter, effectNoise;
    function refresh() {
        label.textContent = !Audio ? "NO AUDIO" : enabled ? "SOUND ON" : "MUTED";
        button.disabled = !Audio;
        button.setAttribute("aria-pressed", String(!!Audio && enabled));
        button.setAttribute("aria-label", enabled ? "Mute game sound" : "Enable game sound");
        if (master) master.gain.setTargetAtTime(enabled && !document.hidden ? 0.6 : 0, context.currentTime, 0.025);
    }
    function unlock() {
        if (!Audio || !enabled) return;
        if (!context) {
            try {
                context = new Audio();
                master = context.createGain();
                master.gain.value = 0.6;
                master.connect(context.destination);
                engineGain = context.createGain();
                engineGain.gain.value = 0;
                engineGain.connect(master);
                const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
                const samples = buffer.getChannelData(0);
                effectNoise = context.createBuffer(1, samples.length, context.sampleRate);
                const whiteNoise = effectNoise.getChannelData(0);
                let last = 0;
                for (let i = 0; i < samples.length; i++) {
                    whiteNoise[i] = Math.random() * 2 - 1;
                    last = (last + whiteNoise[i] * 0.18) / 1.14;
                    samples[i] = last * 2.1;
                }
                const wind = context.createBufferSource();
                wind.buffer = buffer;
                wind.loop = true;
                filter = context.createBiquadFilter();
                filter.type = "lowpass";
                wind.connect(filter).connect(engineGain);
                wind.start();
                turbine = context.createOscillator();
                turbine.type = "triangle";
                const low = context.createGain();
                low.gain.value = 0.12;
                turbine.connect(low).connect(engineGain);
                turbine.start();
            } catch { return; }
        }
        if (context.state !== "running") context.resume().catch(() => {});
    }
    function noiseBurst(time, duration, attack, volume, startHz, endHz) {
        const source = context.createBufferSource();
        source.buffer = effectNoise;
        const band = context.createBiquadFilter();
        band.type = "bandpass";
        band.Q.value = 0.8;
        band.frequency.setValueAtTime(startHz, time);
        band.frequency.exponentialRampToValueAtTime(endHz, time + duration);
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(volume, time + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        source.connect(band).connect(gain).connect(master);
        source.onended = () => { source.disconnect(); band.disconnect(); gain.disconnect(); };
        source.start(time, Math.random() * (effectNoise.duration - duration), duration);
    }
    function dropEffect(name) {
        if (!enabled || !effectNoise || document.hidden) return;
        const now = context.currentTime;
        if (name === "release") {
            noiseBurst(now, 0.055, 0.002, 0.85, 3600, 1500);
            noiseBurst(now + 0.048, 0.085, 0.003, 0.6, 2400, 850);
            noiseBurst(now + 0.04, 0.52, 0.11, 0.46, 700, 2200);
        } else if (name === "canopy") {
            noiseBurst(now, 0.2, 0.004, 1.15, 1400, 190);
            noiseBurst(now + 0.075, 0.32, 0.022, 0.55, 2900, 600);
            noiseBurst(now + 0.19, 0.24, 0.018, 0.31, 2100, 800);
        } else if (name === "touchdown") {
            for (const delay of [0, 0.09, 0.21]) {
                noiseBurst(now + delay, 0.21, 0.005, 1.25, 320, 85);
                noiseBurst(now + delay + 0.018, 0.1, 0.005, 0.38, 3000, 900);
            }
        }
    }
    function cue(name) {
        if (!enabled || !master || document.hidden) return;
        const start = context.currentTime;
        notes[name].forEach((frequency, index) => {
            const time = start + index * 0.105;
            const tone = context.createOscillator();
            const envelope = context.createGain();
            tone.type = name === "edge" || name === "miss" ? "triangle" : "sine";
            tone.frequency.value = frequency;
            envelope.gain.setValueAtTime(0.0001, time);
            envelope.gain.exponentialRampToValueAtTime(0.105, time + 0.012);
            envelope.gain.exponentialRampToValueAtTime(0.0001, time + 0.23);
            tone.connect(envelope).connect(master);
            tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
            tone.start(time);
            tone.stop(time + 0.24);
        });
    }
    function throttle(value, active) {
        if (!turbine) return;
        const now = context.currentTime;
        engineGain.gain.setTargetAtTime(active ? 0.17 + value * 0.13 : 0, now, 0.12);
        turbine.frequency.setTargetAtTime(40 + value * 49, now, 0.18);
        filter.frequency.setTargetAtTime(420 + value * 1350, now, 0.18);
    }
    button.addEventListener("click", () => {
        enabled = !enabled;
        try { localStorage.setItem("karunai.sound", enabled ? "on" : "off"); } catch {}
        unlock();
        refresh();
        cue("ready");
    });
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return { unlock, cue, throttle, dropEffect };
}
async function startGame(files) {
    loadingText.textContent = "LOADING 3D ENGINE…";
    let engine;
    try {
        engine = await Promise.all([
            import("three"),
            import("three/addons/controls/OrbitControls.js"),
            import("three/addons/loaders/GLTFLoader.js")
        ]);
    } catch (error) {
        throw new Error("Could not load the 3D engine. Check your internet connection and reload.", { cause: error });
    }
    const [THREE, { OrbitControls }, { GLTFLoader }] = engine;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07131b);
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 20000);
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (error) {
        throw new Error("This game needs WebGL 2. Enable graphics acceleration in your browser and reload.", { cause: error });
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const viewport = document.querySelector("#scene-container");
    viewport.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x46515b, 1.5));
    const sunlight = new THREE.DirectionalLight(0xffffff, 2);
    sunlight.position.set(100, 200, 100);
    scene.add(sunlight);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI * 0.4;
    const loader = new GLTFLoader();
    async function loadModel(name, label, start, weight) {
        loadingText.textContent = label;
        const url = files ? URL.createObjectURL(files.get(name)) : "./3D/" + name;
        try {
            return await loader.loadAsync(url, event => {
                if (event.total > 0) {
                    const fraction = event.loaded / event.total;
                    progressBar.style.width = (start + fraction * weight) + "%";
                    loadingText.textContent = label + " " + Math.round(fraction * 100) + "%";
                }
            });
        } catch (error) {
            throw new Error("Could not load " + name + ". Check the 3D folder and reload.", { cause: error });
        } finally {
            if (files) URL.revokeObjectURL(url);
        }
    }
    const island = await loadModel(islandFile, "LOADING ISLAND", 0, 90);
    const land = island.scene.children.find(node => node.name.includes("LiDAR")) || island.scene;
    const bounds = new THREE.Box3().setFromObject(land);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z);
    island.scene.position.sub(center);
    scene.add(island.scene);
    let oceanMixer;
    if (island.animations.length) {
        oceanMixer = new THREE.AnimationMixer(island.scene);
        oceanMixer.clipAction(island.animations[0]).play();
    }
    const seaHaze = new THREE.FogExp2(0xb8d9e3, 1.55 / span);
    const limitX = size.x / 2 - span * 0.026;
    const limitZ = size.z / 2 - span * 0.026;
    const flightRadius = Math.min(limitX, limitZ) * 0.78;
    let returning = false;
    let nextEdgeCue = 0;
    const flightAltitude = size.y / 2 + span * 0.085;
    const aircraft = new THREE.Group();
    aircraft.name = "KARUNAI_AIRCRAFT";
    let planeMixer;
    let aircraftReady = false;
    try {
        const plane = await loadModel(planeFile, "LOADING AIRCRAFT", 90, 6);
        const planeBounds = new THREE.Box3().setFromObject(plane.scene);
        const planeSize = planeBounds.getSize(new THREE.Vector3());
        const scale = span * 0.035 / Math.max(planeSize.x, planeSize.y, planeSize.z);
        plane.scene.position.copy(planeBounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
        plane.scene.scale.setScalar(scale);
        aircraft.add(plane.scene);
        aircraft.position.set(0, flightAltitude, flightRadius);
        aircraft.rotation.order = "YXZ";
        scene.add(aircraft);
        if (plane.animations.length) {
            planeMixer = new THREE.AnimationMixer(plane.scene);
            plane.animations.forEach(clip => planeMixer.clipAction(clip).play());
        }
        aircraftReady = true;
    } catch (error) {
        console.error(error);
    }
    const overviewButton = document.querySelector("#overview-button");
    const aircraftButton = document.querySelector("#aircraft-button");
    const hint = document.querySelector("#control-hint");
    aircraftButton.disabled = !aircraftReady;
    const held = new Set();
    const movementKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
    window.addEventListener("keydown", event => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.code === "Space" && flying && missionState === "running") {
            event.preventDefault();
            if (!event.repeat) dropSquad();
            return;
        }
        if (!movementKeys.has(event.code)) return;
        event.preventDefault();
        held.add(event.code);
    });
    window.addEventListener("keyup", event => held.delete(event.code));
    window.addEventListener("blur", () => held.clear());
    document.addEventListener("visibilitychange", () => held.clear());
    let flying = false;
    let heading = Math.PI / 2;
    const cruiseSpeed = span * 0.085;
    let speed = cruiseSpeed;
    const forward = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const audio = createGameAudio();
    const stageLabel = document.querySelector("#mission-stage");
    const timeLabel = document.querySelector("#mission-clock");
    const guide = document.querySelector("#mission-guide");
    const message = document.querySelector("#mission-message");
    const dropButton = document.querySelector("#drop-button");
    const zones = [
        { name: "Ember", x: -0.145, z: 0.085, opens: 1.5, closes: 17 },
        { name: "Halo", x: 0.177, z: -0.199, opens: 5, closes: 29 },
        { name: "Drift", x: 0.195, z: -0.035, opens: 9, closes: 42 },
        { name: "Vesper", x: 0.075, z: 0.175, opens: 13, closes: 55 }
    ];
    const mapCanvas = document.querySelector("#route-map");
    const chart = mapCanvas.getContext("2d");
    const chartScale = mapCanvas.height * 0.93 / span;
    const chartX = x => mapCanvas.width / 2 + x * chartScale;
    const chartZ = z => mapCanvas.height / 2 + z * chartScale;
    const baseMap = document.createElement("canvas");
    baseMap.width = mapCanvas.width;
    baseMap.height = mapCanvas.height;
    const base = baseMap.getContext("2d");
    base.fillStyle = "#121d19";
    base.fillRect(0, 0, baseMap.width, baseMap.height);
    const gridSize = 120;
    const heights = new Float32Array(gridSize * gridSize).fill(-Infinity);
    const cell = span / gridSize;
    function cellAt(v) { return THREE.MathUtils.clamp(Math.floor(v / cell + gridSize / 2), 0, gridSize - 1); }
    const vertex = new THREE.Vector3();
    island.scene.updateMatrixWorld(true);
    const terrainMeshes = [];
    land.traverse(mesh => {
        if (!mesh.isMesh || !mesh.material.map) return;
        terrainMeshes.push(mesh);
        const positions = mesh.geometry.getAttribute("position");
        for (let i = 0; i < positions.count; i += 2) {
            vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
            const index = cellAt(vertex.z) * gridSize + cellAt(vertex.x);
            heights[index] = Math.max(heights[index], vertex.y);
        }
    });
    const seaLevel = -center.y;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const i = row * gridSize + col;
            const height = heights[i] - seaLevel;
            if (height <= 0) continue;
            const band = Math.floor(height / 6);
            base.fillStyle = Math.floor((heights[i - 1] - seaLevel) / 6) < band ? "#79846e" :
                "hsl(112 9% " + (23 + Math.min(band, 6) * 2) + "%)";
            base.fillRect(chartX((col - gridSize / 2) * cell), chartZ((row - gridSize / 2) * cell), cell * chartScale + 0.5, cell * chartScale + 0.5);
        }
    }
    base.strokeStyle = "#a3dad421";
    base.lineWidth = 1;
    base.beginPath();
    for (let x = 0; x <= baseMap.width; x += 32) { base.moveTo(x, 0); base.lineTo(x, baseMap.height); }
    for (let y = 0; y <= baseMap.height; y += 32) { base.moveTo(0, y); base.lineTo(baseMap.width, y); }
    base.stroke();
    base.strokeStyle = "#afd2b887";
    base.setLineDash([4, 5]);
    base.beginPath();
    base.ellipse(chartX(0), chartZ(0), limitX * chartScale, limitZ * chartScale, 0, 0, 2 * Math.PI);
    base.stroke();
    const dropRadius = span * 0.062;
    const groundRay = new THREE.Raycaster();
    groundRay.ray.direction.set(0, -1, 0);
    function groundHeight(x, z) {
        groundRay.ray.origin.set(x, flightAltitude, z);
        const hit = groundRay.intersectObjects(terrainMeshes, false)[0];
        if (!hit || hit.point.y <= seaLevel) throw new Error("A drop zone falls outside the island terrain.");
        return hit.point.y;
    }
    for (const zone of zones) {
        const x = zone.x * span, z = zone.z * span;
        zone.position = new THREE.Vector3(x, groundHeight(x, z), z);
    }
    const soldier = (await loadModel(soldierFile, "LOADING SQUADS", 96, 4)).scene;
    const soldierBounds = new THREE.Box3().setFromObject(soldier);
    const soldierScale = 2.3 / (soldierBounds.max.y - soldierBounds.min.y);
    const soldierCenter = soldierBounds.getCenter(new THREE.Vector3());
    soldier.scale.setScalar(soldierScale);
    soldier.position.set(-soldierCenter.x, -soldierBounds.min.y, -soldierCenter.z).multiplyScalar(soldierScale);
    const fabric = new THREE.MeshStandardMaterial({ color: 0xe7ae60, side: THREE.DoubleSide });
    const rig = new THREE.Group();
    rig.position.y = 1.6;
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 5, 0, 2 * Math.PI, 0, Math.PI / 2), fabric);
    canopy.scale.y = 0.5;
    canopy.position.y = 3.1;
    rig.add(canopy);
    const cords = [];
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const side = i < 3 ? 1 : -1;
        cords.push(new THREE.Vector3(2.5 * Math.cos(angle), 3.1, 2.5 * Math.sin(angle)), new THREE.Vector3(0, 0, side * 0.32));
    }
    rig.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cords),
        new THREE.LineBasicMaterial({ color: 0x394741 })));
    const squads = zones.map(zone => {
        const group = new THREE.Group();
        group.visible = false;
        const rigs = [];
        const landingOffsets = [];
        for (let i = 0; i < 3; i++) {
            const member = new THREE.Group();
            const parachute = rig.clone();
            rigs.push(parachute);
            member.add(soldier.clone(), parachute);
            member.scale.setScalar(span * 0.0018);
            member.position.set((i - 1) * span * 0.006, 0, (i % 2) * span * 0.004);
            const ground = groundHeight(zone.position.x + member.position.x, zone.position.z + member.position.z);
            landingOffsets.push(ground - zone.position.y);
            group.add(member);
        }
        scene.add(group);
        return { group, rigs, landingOffsets, release: new THREE.Vector3(), age: 0 };
    });
    let missionState = "idle";
    let nextZone = 0;
    let elapsed = 0;
    let clearMessageAt = 0;
    const landingSeconds = 2.4;
    const canopyOpenSeconds = 0.4;
    let wasReady = false;
    const labelPoint = new THREE.Vector3();
    const flightStrip = document.querySelector("#flight-strip");
    const headingReadout = document.querySelector("#heading");
    const throttleReadout = document.querySelector("#throttle");
    const boundaryNotice = document.querySelector("#boundary");
    const dropCount = document.querySelector("#drop-count");
    const marker = document.querySelector("#zone-marker");
    const markerText = marker.querySelector("span");
    const mapPanel = document.querySelector("#map-panel");
    const rangeReadout = document.querySelector("#range");
    const tape = document.querySelector("#heading-tape").getContext("2d");
    const simulation = document.querySelector("#simulation");
    const ending = document.querySelector("#chapter-end");
    function drawCompass(degrees) {
        const { width, height } = tape.canvas;
        tape.clearRect(0, 0, width, height);
        tape.strokeStyle = tape.fillStyle = "#ceffbc";
        tape.lineWidth = 2;
        tape.textAlign = "center";
        tape.font = "18px Menlo, monospace";
        const cardinals = ["N", "E", "S", "W"];
        for (let tick = Math.ceil((degrees - 32) / 5) * 5; tick <= degrees + 32; tick += 5) {
            const x = width / 2 + (tick - degrees) * width / 64;
            const value = (tick + 360) % 360;
            const major = value % 15 === 0;
            tape.beginPath();
            tape.moveTo(x, 8); tape.lineTo(x, major ? 23 : 15); tape.stroke();
            if (major && x > 18 && x < width - 18) tape.fillText(cardinals[value / 90] || String(value).padStart(3, "0"), x, 45);
        }
    }
    function drawFlightHud() {
        const navigating = flying && missionState === "running";
        const zone = zones[nextZone];
        const throttle = THREE.MathUtils.clamp((speed / span - 0.035) / 0.145, 0, 1);
        audio.throttle(throttle, navigating);
        flightStrip.hidden = mapPanel.hidden = !navigating;
        boundaryNotice.hidden = !(returning && navigating);
        marker.hidden = true;
        if (!navigating) return;
        chart.drawImage(baseMap, 0, 0);
        const x = chartX(zone.position.x), y = chartZ(zone.position.z);
        chart.strokeStyle = "#c9ffb9";
        chart.lineWidth = 2;
        chart.beginPath();
        chart.arc(x, y, dropRadius * chartScale, 0, Math.PI * 2);
        chart.stroke();
        chart.fillStyle = "#c9ffb9";
        chart.fillRect(x - 2, y - 2, 4, 4);
        chart.textAlign = "right";
        chart.font = "bold 16px Menlo, monospace";
        chart.fillText("N ↑", mapCanvas.width - 10, 20);
        camera.updateMatrixWorld();
        labelPoint.copy(zone.position).applyMatrix4(camera.matrixWorldInverse);
        const behind = labelPoint.z >= -camera.near;
        if (behind) {
            const bearing = Math.atan2(aircraft.position.x - zone.position.x, aircraft.position.z - zone.position.z) - heading;
            labelPoint.set(-Math.sin(bearing), Math.cos(bearing), 0);
        } else {
            labelPoint.applyMatrix4(camera.projectionMatrix);
        }
        const offscreen = behind || Math.abs(labelPoint.x) > 0.86 || Math.abs(labelPoint.y) > 0.77;
        marker.classList.toggle("offscreen", offscreen);
        if (offscreen) {
            const extent = Math.max(Math.abs(labelPoint.x) / 0.78, Math.abs(labelPoint.y) / 0.52);
            marker.style.setProperty("--direction", Math.atan2(labelPoint.x, labelPoint.y) + "rad");
            labelPoint.multiplyScalar(1 / extent);
        }
        marker.style.left = (labelPoint.x + 1) * 50 + "%";
        marker.style.top = (1 - labelPoint.y) * 50 + "%";
        markerText.textContent = "DZ " + String(nextZone + 1).padStart(2, "0") + " / " + zone.name;
        marker.hidden = false;
        if (aircraftReady) {
            chart.save();
            chart.translate(chartX(aircraft.position.x), chartZ(aircraft.position.z));
            chart.rotate(-heading);
            chart.beginPath();
            chart.moveTo(0, -11); chart.lineTo(7, 8); chart.lineTo(0, 5); chart.lineTo(-7, 8); chart.closePath();
            chart.fillStyle = "#fff"; chart.strokeStyle = "#152529"; chart.lineWidth = 2;
            chart.fill(); chart.stroke(); chart.restore();
        }
        const degrees = THREE.MathUtils.euclideanModulo(-THREE.MathUtils.radToDeg(heading), 360);
        headingReadout.textContent = String(Math.round(degrees) % 360).padStart(3, "0") + "°";
        throttleReadout.textContent = Math.round(throttle * 100) + "%";
        rangeReadout.textContent = Math.round(Math.hypot(aircraft.position.x - zone.position.x, aircraft.position.z - zone.position.z)) + " m";
        dropCount.textContent = nextZone + " / " + zones.length;
        drawCompass(degrees);
    }
    function startMission() {
        squads.forEach(squad => {
            squad.group.visible = false;
            squad.age = 0;
        });
        aircraft.position.set(-0.22 * span, flightAltitude, 0.35 * span);
        heading = Math.atan2(aircraft.position.x - zones[0].position.x, aircraft.position.z - zones[0].position.z);
        returning = false;
        wasReady = false;
        nextEdgeCue = 0;
        audio.cue("start");
        speed = cruiseSpeed;
        elapsed = 0;
        nextZone = 0;
        missionState = "running";
        message.textContent = "";
        setView(true);
    }
    function insideZone() {
        const target = zones[nextZone].position;
        return Math.hypot(aircraft.position.x - target.x, aircraft.position.z - target.z) <= dropRadius;
    }
    function dropSquad() {
        if (!flying || missionState !== "running") return;
        const zone = zones[nextZone];
        clearMessageAt = elapsed + 1.5;
        if (elapsed < zone.opens || elapsed > zone.closes || !insideZone()) {
            message.textContent = elapsed < zone.opens ? "Hold the squad until the window opens." : "Outside the drop zone. Check your navigation display.";
            return;
        }
        const squad = squads[nextZone];
        squad.release.copy(aircraft.position);
        squad.group.position.copy(squad.release);
        squad.group.children.forEach((member, i) => {
            member.position.y = 0;
            member.rotation.y = heading - Math.PI / 2 + (i - 1) * 0.18;
        });
        for (const parachute of squad.rigs) {
            parachute.visible = true;
            parachute.scale.setScalar(0.06);
        }
        squad.group.visible = true;
        audio.dropEffect("release");
        wasReady = false;
        nextZone++;
        message.textContent = "Squad " + nextZone + " away.";
        if (nextZone === zones.length) missionState = "landing";
        drawFlightHud();
        updateMissionPanel();
    }
    function updateMissionPanel() {
        if (missionState === "idle") {
            stageLabel.textContent = "Mission brief";
            timeLabel.textContent = "";
            guide.textContent = "Deliver four squads to Karunai Island. Follow the drop cue on your HUD and release each squad inside its window.";
            message.textContent = "";
            dropButton.hidden = true;
            aircraftButton.hidden = false;
            return;
        }
        aircraftButton.hidden = flying && (missionState === "running" || missionState === "landing");
        const running = missionState === "running";
        dropButton.hidden = !running || !flying;
        if (!flying) {
            stageLabel.textContent = "Mission paused";
            timeLabel.textContent = "";
            guide.textContent = "Resume the sortie to return to the aircraft.";
        } else if (running) {
            const zone = zones[nextZone];
            const open = elapsed >= zone.opens;
            const inside = insideZone();
            stageLabel.textContent = "DZ " + String(nextZone + 1).padStart(2, "0") + " / " + zone.name;
            timeLabel.textContent = (open ? "Window −" : "Opens in ") +
                Math.max(0, (open ? zone.closes : zone.opens) - elapsed).toFixed(1) + " s";
            const target = zones[nextZone].position;
            const bearing = Math.atan2(aircraft.position.x - target.x, aircraft.position.z - target.z) - heading;
            const turn = Math.atan2(Math.sin(bearing), Math.cos(bearing));
            const direction = Math.abs(turn) < 0.12 ? "Hold present heading." : turn > 0 ? "Turn left toward the drop cue." : "Turn right toward the drop cue.";
            guide.textContent = inside ? (open ? "Over the zone. Cleared to release." : "Over the zone. Stand by.") : direction;
            const ready = open && inside;
            if (ready && !wasReady) audio.cue("ready");
            wasReady = ready;
            dropButton.disabled = !ready;
        } else {
            timeLabel.textContent = "";
            stageLabel.textContent = missionState === "lost" ? "Window missed" : "Squad away";
            guide.textContent = missionState === "lost" ? "The release window has closed. Restart the sortie to try again." : "Watching for final touchdown.";
        }
    }
    async function showChapterEnding() {
        simulation.inert = true;
        ending.hidden = false;
        ending.focus();
        await Promise.allSettled(ending.getAnimations().map(animation => animation.finished));
        simulation.hidden = true;
        renderer.setAnimationLoop(null);
    }
    function advanceMission(delta) {
        if (missionState === "running") {
            elapsed += delta;
            if (message.textContent && elapsed >= clearMessageAt) message.textContent = "";
            if (elapsed > zones[nextZone].closes) {
                missionState = "lost";
                drawFlightHud();
                audio.cue("miss");
                message.textContent = "";
                aircraftButton.textContent = "RETRY MISSION";
            }
        }
        for (let i = 0; i < nextZone; i++) {
            const squad = squads[i];
            if (squad.age >= landingSeconds) continue;
            const opening = squad.age < canopyOpenSeconds;
            squad.age = Math.min(landingSeconds, squad.age + delta);
            if (opening) {
                const spread = THREE.MathUtils.smoothstep(squad.age, 0.08, canopyOpenSeconds);
                squad.rigs.forEach(rig => rig.scale.setScalar(0.06 + 0.94 * spread));
                if (squad.age >= canopyOpenSeconds) audio.dropEffect("canopy");
            }
            const descent = squad.age / landingSeconds;
            squad.group.position.lerpVectors(squad.release, zones[i].position, descent);
            squad.group.children.forEach((member, index) => { member.position.y = squad.landingOffsets[index] * descent; });
            if (squad.age === landingSeconds) {
                squad.rigs.forEach(rig => { rig.visible = false; });
                audio.dropEffect("touchdown");
                if (i === zones.length - 1) {
                    missionState = "won";
                    audio.cue("win");
                    audio.throttle(0, false);
                    held.clear();
                    showChapterEnding();
                    return;
                }
            }
        }
        if (missionState === "landing") {
            const lastSquad = squads[zones.length - 1].group;
            desiredCamera.set(0.008, 0.02, 0.053)
                .multiplyScalar(span / Math.min(camera.aspect, 1)).applyAxisAngle(aircraft.up, heading).add(lastSquad.position);
            camera.position.lerp(desiredCamera, 1 - Math.exp(-3 * delta));
            lookTarget.copy(lastSquad.position);
            lookTarget.y += span * 0.006;
            camera.lookAt(lookTarget);
        }
        updateMissionPanel();
    }
    function frameIsland() {
        const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const distance = size.y / 2 + Math.max(size.x * 0.83 / camera.aspect, size.z * 0.88) / (2 * halfFov);
        controls.minDistance = span * 0.2;
        controls.maxDistance = Math.max(span * 2.5, distance);
        camera.far = controls.maxDistance + span * 5;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, span * 0.09);
        camera.position.set(0, distance * 0.96, controls.target.z + distance * 0.28);
        controls.update();
    }
    function followAircraft(blend) {
        desiredCamera.copy(aircraft.position).addScaledVector(forward, -span * 0.088);
        desiredCamera.y += span * 0.033;
        camera.position.lerp(desiredCamera, blend);
        lookTarget.copy(aircraft.position).addScaledVector(forward, span * 0.05);
        camera.lookAt(lookTarget);
    }
    function resizeViewport() {
        const { clientWidth, clientHeight } = viewport;
        camera.aspect = clientWidth / Math.max(clientHeight, 1);
        camera.updateProjectionMatrix();
        renderer.setSize(clientWidth, clientHeight);
    }
    function setView(byAir) {
        held.clear();
        flying = byAir;
        document.body.classList.toggle("in-flight", flying);
        resizeViewport();
        controls.enabled = !byAir;
        scene.fog = byAir ? seaHaze : null;
        scene.background.set(byAir ? seaHaze.color : 0x07131b);
        overviewButton.hidden = !byAir;
        if (byAir) {
            forward.set(-Math.sin(heading), 0, -Math.cos(heading));
            aircraft.rotation.set(0, heading, 0);
            followAircraft(1);
            aircraftButton.textContent = "Begin sortie";
            hint.textContent = "W/S Throttle    A/D Turn    Space Release";
        } else {
            if (missionState === "lost") {
                missionState = "idle";
                nextZone = 0;
                returning = false;
                squads.forEach(squad => { squad.group.visible = false; });
            }
            aircraftButton.textContent = missionState === "idle" ? "Begin sortie" : "Resume sortie";
            frameIsland();
            hint.textContent = "Drag to orbit · Scroll to zoom";
            if (!aircraftReady) hint.textContent += " · Aircraft unavailable";
        }
        drawFlightHud();
        updateMissionPanel();
    }
    dropButton.addEventListener("click", dropSquad);
    overviewButton.addEventListener("click", () => setView(false));
    aircraftButton.addEventListener("click", () => {
        audio.unlock();
        if (missionState === "idle" || missionState === "lost") startMission();
        else if (!flying) setView(true);
    });
    setView(false);
    const cameraRight = new THREE.Vector3();
    const pan = new THREE.Vector3();
    function panMap(sideways, ahead, delta) {
        cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
        cameraRight.y = 0;
        cameraRight.normalize();
        pan.set(cameraRight.z, 0, -cameraRight.x).multiplyScalar(ahead).addScaledVector(cameraRight, sideways);
        pan.normalize().multiplyScalar(controls.getDistance() * 0.55 * delta);
        const limit = span * 0.95;
        const target = controls.target;
        pan.x = THREE.MathUtils.clamp(target.x + pan.x, -limit, limit) - target.x;
        pan.z = THREE.MathUtils.clamp(target.z + pan.z, -limit, limit) - target.z;
        target.add(pan);
        camera.position.add(pan);
    }
    function turnToward(targetHeading, delta, maxRate = 1.4) {
        const difference = targetHeading - heading;
        const shortest = Math.atan2(Math.sin(difference), Math.cos(difference));
        return THREE.MathUtils.clamp(shortest / delta, -maxRate, maxRate);
    }
    function moveAircraft(sideways, throttle, delta) {
        const { x, z } = aircraft.position;
        let turn;
        if (flying) {
            speed = THREE.MathUtils.clamp(speed + throttle * span * 0.065 * delta, span * 0.035, span * 0.18);
            turn = -sideways * 1.2;
            const radius = Math.hypot(x / limitX, z / limitZ);
            const aheadX = x - Math.sin(heading) * speed * 0.7;
            const aheadZ = z - Math.cos(heading) * speed * 0.7;
            const projected = Math.hypot(aheadX / limitX, aheadZ / limitZ);
            if (!returning && projected >= 0.97 && projected > radius) {
                returning = true;
                if (elapsed >= nextEdgeCue) {
                    audio.cue("edge");
                    nextEdgeCue = elapsed + 3;
                }
            }
            if (returning && radius < 0.76 && projected < radius) returning = false;
            if (returning) {
                turn = turnToward(Math.atan2(x, z), delta, 2.8);
            }
        } else {
            const angle = Math.atan2(z, x) + 0.2;
            const dx = Math.cos(angle) * flightRadius - x;
            const dz = Math.sin(angle) * flightRadius - z;
            turn = turnToward(Math.atan2(-dx, -dz), delta);
            speed = THREE.MathUtils.damp(speed, cruiseSpeed, 2, delta);
        }
        heading += turn * delta;
        forward.set(-Math.sin(heading), 0, -Math.cos(heading));
        aircraft.position.addScaledVector(forward, speed * delta);
        const extent = Math.hypot(aircraft.position.x / limitX, aircraft.position.z / limitZ);
        if (extent > 1) {
            aircraft.position.x /= extent;
            aircraft.position.z /= extent;
        }
        aircraft.rotation.y = heading;
        aircraft.rotation.z = THREE.MathUtils.damp(aircraft.rotation.z, turn * 0.28, 4, delta);
        if (flying) followAircraft(1 - Math.exp(-8 * delta));
    }
    window.addEventListener("resize", () => {
        if (simulation.hidden) return;
        resizeViewport();
        if (!flying) frameIsland();
    });
    const clock = new THREE.Clock();
    let hudDelay = 0;
    renderer.setAnimationLoop(() => {
        const delta = Math.min(clock.getDelta(), 0.1);
        const sideways = Number(held.has("KeyD")) - Number(held.has("KeyA"));
        const ahead = Number(held.has("KeyW")) - Number(held.has("KeyS"));
        if (document.hidden) return;
        if (aircraftReady && delta > 0 && (missionState === "idle" || (flying && missionState === "running"))) {
            moveAircraft(sideways, ahead, delta);
        }
        if (flying && missionState !== "won") advanceMission(delta);
        planeMixer?.update(delta);
        oceanMixer?.update(delta);
        if (!flying) {
            panMap(sideways, ahead, delta);
            controls.update();
        }
        hudDelay -= delta;
        if (hudDelay <= 0) {
            drawFlightHud();
            hudDelay = 1 / 24;
        }
        renderer.render(scene, camera);
    });
    progressBar.style.width = "100%";
    loadingText.textContent = "WORLD READY";
    loadingScreen.classList.add("hidden");
}
function launch(files) {
    modelFiles.hidden = true;
    startGame(files).catch(error => {
        console.error(error);
        loadingText.textContent = error.message;
    });
}
if (location.protocol === "file:") {
    loadingText.textContent = "Select all three .glb files from the game’s 3D folder to play.";
    modelFiles.hidden = false;
    modelFiles.addEventListener("change", () => {
        const files = new Map(Array.from(modelFiles.files, file => [file.name, file]));
        if ([islandFile, planeFile, soldierFile].every(name => files.has(name))) {
            launch(files);
        } else {
            loadingText.textContent = "Choose little_saint_james.glb, plane.glb and TacticalSoldier.glb together.";
            modelFiles.value = "";
        }
    });
} else {
    launch();
}
