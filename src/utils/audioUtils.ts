// Base64 encoding function
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 decoding function
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer that can be played by the browser.
 * @param data The raw audio data as a Uint8Array.
 * @param ctx The AudioContext to use for creating the buffer.
 * @param sampleRate The sample rate of the audio.
 * @param numChannels The number of audio channels.
 * @returns A promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // The raw data is Int16, so we create a view of the buffer as Int16Array
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  
  // Create an AudioBuffer with the correct parameters
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  // Fill the AudioBuffer with the PCM data, converting from Int16 to Float32
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize the Int16 value to the Float32 range [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
