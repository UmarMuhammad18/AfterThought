/**
 * The browser end of a WhatsApp Business call (WebRTC).
 *
 * WhatsApp exchanges one SDP each way (no trickle ICE), so we wait for ICE
 * gathering to finish before handing our SDP to the server.
 */

export class BrowserCall {
  private pc: RTCPeerConnection
  private mic: MediaStream | null = null
  private audioEl: HTMLAudioElement
  private remote: Promise<MediaStream>
  private resolveRemote!: (s: MediaStream) => void

  onStateChange?: (state: RTCPeerConnectionState) => void

  constructor(iceServers: RTCIceServer[]) {
    this.pc = new RTCPeerConnection({ iceServers })
    this.remote = new Promise((r) => (this.resolveRemote = r))
    this.audioEl = new Audio()
    this.audioEl.autoplay = true

    this.pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      this.audioEl.srcObject = stream
      void this.audioEl.play().catch(() => undefined)
      this.resolveRemote(stream)
    }
    this.pc.onconnectionstatechange = () => this.onStateChange?.(this.pc.connectionState)
  }

  /** The other person's audio, once it arrives. */
  remoteStream(): Promise<MediaStream> {
    return this.remote
  }

  private async attachMic() {
    this.mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    this.mic.getTracks().forEach((t) => this.pc.addTrack(t, this.mic!))
  }

  private waitForIce(timeoutMs = 4000): Promise<void> {
    if (this.pc.iceGatheringState === "complete") return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        this.pc.removeEventListener("icegatheringstatechange", check)
        resolve()
      }
      const check = () => {
        if (this.pc.iceGatheringState === "complete") done()
      }
      this.pc.addEventListener("icegatheringstatechange", check)
      // Enough candidates are usually gathered well before "complete".
      setTimeout(done, timeoutMs)
    })
  }

  /** Incoming call: apply WhatsApp's offer and produce our answer. */
  async answer(offerSdp: string): Promise<string> {
    await this.attachMic()
    await this.pc.setRemoteDescription({ type: "offer", sdp: offerSdp })
    await this.pc.setLocalDescription(await this.pc.createAnswer())
    await this.waitForIce()
    return this.pc.localDescription!.sdp
  }

  /** Outgoing call: produce our offer; call applyAnswer() when WhatsApp replies. */
  async offer(): Promise<string> {
    await this.attachMic()
    await this.pc.setLocalDescription(await this.pc.createOffer({ offerToReceiveAudio: true }))
    await this.waitForIce()
    return this.pc.localDescription!.sdp
  }

  async applyAnswer(answerSdp: string): Promise<void> {
    if (this.pc.remoteDescription) return
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
  }

  setMuted(muted: boolean) {
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !muted))
  }

  hangup() {
    this.mic?.getTracks().forEach((t) => t.stop())
    this.pc.getSenders().forEach((s) => s.track?.stop())
    this.pc.close()
    this.audioEl.srcObject = null
  }
}

/** A short two-tone ring, generated so there's no audio asset to ship. */
export function playRing(): () => void {
  const ctx = new AudioContext()
  let stopped = false
  const ring = () => {
    if (stopped) return
    ;[0, 0.45].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = offset ? 480 : 440
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + offset + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.42)
    })
  }
  ring()
  const t = setInterval(ring, 2500)
  return () => {
    stopped = true
    clearInterval(t)
    void ctx.close().catch(() => undefined)
  }
}
