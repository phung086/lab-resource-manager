// Exact, self-contained app guidance only. Mixed questions always reach the receiver.
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/\s+/g, ' ').trim().replace(/[?!.,…]+$/g, '').trim();
const intents = [
  ['greeting', /^(xin chao( ban| bot)?|chao( ban| bot)?|hello( lab)?|hi|hey|good (morning|afternoon|evening))$/],
  ['capabilities', /^(ban la ai|ban (co the )?(lam|giup) (duoc )?gi|tro ly lab la gi|who are you|what can you (do|help with))$/],
  ['thanks', /^(cam on( ban| nhe)?|thank you|thanks|ok|okay)$/],
  ['booking', /^(cach dat (lich|phong|thiet bi)|huong dan dat (lich|phong|thiet bi)|giup toi dat lich|how (do i|to) book( a (room|resource))?)$/],
  ['payment', /^(huong dan thanh toan|cach thanh toan|how (do i|to) pay|payment (guide|guidance))$/]
];
export function quickReplyKey(message) {
  const text = normalize(message);
  const match = intents.find(([, pattern]) => pattern.test(text));
  return match ? `assistant.quick.${match[0]}` : null;
}
