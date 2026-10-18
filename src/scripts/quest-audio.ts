// 任务房间的声音：用 Web Audio 实时合成的循环小曲与音效。全部是程序生成的原创音，不使用任何现成的音频文件。
// 音频必须在用户操作后才能启动（浏览器的自动播放限制），因此由 quest.ts 在"开始"按钮里调用 unlock()。
// 静音偏好保存在本机 localStorage；存储不可用时退回为默认的有声状态。

const STORAGE_KEY = "quest-muted";
const BPM = 96;
const STEP = 60 / BPM / 2; // 八分音符
const STEPS = 32; // 两小节循环
// 小调五声音阶的近似频率（Hz），旋律只在其中取音，所以怎么组合都不会刺耳。
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
// 旋律的音阶序号：每个八分音符取一个，循环一次约 4 秒一小节。
const MELODY = [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 6, 5, 3, 2, 0, 4, 5, 6, 5, 3, 2, 1, 0, 2, 4, 3, 1, 0, 2, 4, 2];

function loadMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // 存储不可用时忽略，本次访问仍然有效。
  }
}

export function createAudio() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let musicBus: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let muted = loadMuted();
  let playing = false;
  let timer = 0;
  let nextTime = 0;
  let step = 0;

  function ensure(): AudioContext | null {
    if (!("AudioContext" in window)) return null;
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.16;
      musicBus.connect(master);
      // 一秒钟的白噪声，供"嗖"的音效使用。
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return ctx;
  }

  // 单个音符：起音很短，之后指数衰减，避免爆音。
  function note(freq: number, when: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode): void {
    const c = ctx!;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function scheduleStep(i: number, when: number): void {
    const bus = musicBus!;
    // 旋律：每个八分音符一个音，偶数拍稍强。
    const melodyFreq = SCALE[MELODY[i % MELODY.length]];
    note(melodyFreq, when, STEP * 0.9, "triangle", i % 2 === 0 ? 0.5 : 0.3, bus);
    // 低音：每个小节的第一拍，根音与五度交替，形成稳定的律动。
    if (i % 8 === 0) {
      const bass = (i / 8) % 2 === 0 ? SCALE[0] / 2 : SCALE[4] / 2;
      note(bass, when, STEP * 3.5, "square", 0.18, bus);
    }
    // 底部的拨弦感：每两拍一次极短的高音，让循环有节奏的"闪"。
    if (i % 4 === 2) note(SCALE[6] * 2, when, 0.05, "sine", 0.08, bus);
  }

  function tick(): void {
    const c = ctx!;
    // 预先排好约 0.12 秒的音符，减少定时器抖动带来的卡顿。
    while (nextTime < c.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % STEPS;
    }
  }

  return {
    // 第一次用户操作时调用：创建音频上下文并恢复播放。
    unlock(): void {
      const c = ensure();
      if (c && c.state === "suspended") void c.resume();
    },
    startMusic(): void {
      const c = ensure();
      if (!c || playing) return;
      playing = true;
      nextTime = c.currentTime + 0.05;
      step = 0;
      timer = window.setInterval(tick, 25);
    },
    stopMusic(): void {
      playing = false;
      window.clearInterval(timer);
    },
    setMuted(value: boolean): void {
      muted = value;
      saveMuted(value);
      if (ctx && master) master.gain.setTargetAtTime(value ? 0 : 0.6, ctx.currentTime, 0.05);
    },
    isMuted(): boolean {
      return muted;
    },
    // 三种短音效：点击互动的"滴"、完成任务的和弦、门开的"嗖"。
    sfx(name: "blip" | "chime" | "whoosh"): void {
      const c = ensure();
      if (!c || muted || !master) return;
      const when = c.currentTime + 0.01;
      if (name === "blip") {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(660, when);
        osc.frequency.exponentialRampToValueAtTime(990, when + 0.08);
        gain.gain.setValueAtTime(0.12, when);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
        osc.connect(gain);
        gain.connect(master);
        osc.start(when);
        osc.stop(when + 0.12);
      } else if (name === "chime") {
        [523.25, 659.25, 783.99].forEach((f, i) => note(f, when + i * 0.09, 0.5, "sine", 0.18, master!));
      } else if (noise) {
        const src = c.createBufferSource();
        const filter = c.createBiquadFilter();
        const gain = c.createGain();
        src.buffer = noise;
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(300, when);
        filter.frequency.exponentialRampToValueAtTime(1800, when + 0.6);
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.25, when + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.7);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        src.start(when);
        src.stop(when + 0.75);
      }
    },
  };
}

export type Audio = ReturnType<typeof createAudio>;
