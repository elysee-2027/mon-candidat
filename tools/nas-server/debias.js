// Redressement de la « réponse randomisée ».
// Le navigateur remplace la réponse par une valeur tirée uniformément parmi K catégories avec la
// probabilité p. Pour une question avec N réponses observées :
//   observé_c = (1 - p) × vrai_c + p × N / K     donc     vrai_c = (observé_c - p × N / K) / (1 - p)
export const CATS = ['2', '1', '0', '-1', '-2', 'na'];

export function debias(observed, p = 0.25) {
  const K = CATS.length;
  const N = CATS.reduce((s, c) => s + (observed[c] || 0), 0);
  const est = {};
  for (const c of CATS) est[c] = Math.max(0, ((observed[c] || 0) - (p * N) / K) / (1 - p));
  const tot = CATS.reduce((s, c) => s + est[c], 0) || 1;
  const share = Object.fromEntries(CATS.map((c) => [c, est[c] / tot]));
  // marge d'erreur approximative à 95 % sur une part (le brouillage augmente la variance)
  const moe = N ? 1.96 * Math.sqrt(0.25 / N) / (1 - p) : 1;
  return { N, share, moe };
}

// Regroupe les compteurs bruts {"a:q42:2": 12, ...} par question.
export function byQuestion(counters) {
  const out = {};
  for (const [k, n] of Object.entries(counters)) {
    const m = /^a:(q\d+):(.+)$/.exec(k);
    if (m) (out[m[1]] ||= {})[m[2]] = n;
  }
  return out;
}
