import './CultureCards.css';

/**
 * "Before You Visit" — practical guidance for tourists (especially foreign
 * visitors) about what a real artisan-workshop visit involves. Mostly generic,
 * with a couple of craft-aware lines so a block-print visit warns about dye and
 * a pottery visit mentions the wheel.
 */

function craftTip(craft = '') {
  const c = craft.toLowerCase();
  if (/(block|ajrakh|dabu|dye|print)/.test(c))
    return 'Natural dyes stain — wear clothes you don\'t mind getting a little indigo on, and expect blue-tinged hands if you try a print yourself.';
  if (/(pottery|ceramic|terracotta|blue pottery)/.test(c))
    return 'You may be invited to try the wheel. Roll up long sleeves — clay gets everywhere, and that\'s part of the fun.';
  if (/(weav|ikat|silk|pashmina|handloom|saree)/.test(c))
    return 'Looms are loud and the work is slow and precise. Watch quietly for a while before asking questions — the rhythm matters.';
  if (/(paint|madhubani|pattachitra|warli)/.test(c))
    return 'Paintings take days. You\'ll see work in progress rather than a finished piece — ask about the story each motif tells.';
  if (/(metal|bidri|dokra|brass|bell)/.test(c))
    return 'Casting and inlay involve heat and fine tools. Keep a little distance from the furnace and follow the artisan\'s lead.';
  if (/(embroider|chikan|phulkari|kutch|mirror)/.test(c))
    return 'The stitching is astonishingly fine. Good light helps — mornings are best for watching the detail.';
  return 'Ask the artisan to show you a piece in progress — seeing the work mid-way tells you more than any finished product.';
}

export default function CultureCards({ artisan }) {
  const a = artisan;
  const duration = a.workshop?.durationMins;
  const langs = a.languages?.join(', ');

  const cards = [
    {
      icon: '👕',
      title: 'What to wear',
      body: 'Dress modestly — this is often a family home. Comfortable clothes you can move and sit on the floor in are ideal.',
    },
    {
      icon: '🙏',
      title: 'Etiquette',
      body: 'Remove your shoes before entering the studio or home. Always ask before photographing the artisan or their family.',
    },
    {
      icon: '🫖',
      title: 'Expect hospitality',
      body: 'You may be offered chai or water. Accepting is a warm gesture — it\'s hospitality, not a sales tactic.',
    },
    {
      icon: '🎨',
      title: 'About this craft',
      body: craftTip(a.craft),
    },
    {
      icon: '🕒',
      title: 'How long',
      body: duration
        ? `Plan for about ${duration} minutes. Unhurried visits are more rewarding — the artisan sets the pace.`
        : 'Visits are unhurried. Allow a couple of hours and let the artisan set the pace.',
    },
    {
      icon: '💬',
      title: 'Language',
      body: langs
        ? `${a.name.split(' ')[0]} speaks ${langs}. A few words of the local language, or a translation app, go a long way.`
        : 'A translation app helps. A smile and genuine curiosity bridge most gaps.',
    },
  ];

  return (
    <section className="panel culture">
      <span className="eyebrow">Before you visit</span>
      <div className="culture__grid">
        {cards.map((c) => (
          <div className="culture__card" key={c.title}>
            <span className="culture__icon">{c.icon}</span>
            <div>
              <strong className="culture__title">{c.title}</strong>
              <p className="culture__body">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}