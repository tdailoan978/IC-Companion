// Marks runs of Chinese inside English text with lang="zh-Hans", so they get
// the Chinese font and size (see .zh-inline in base.css).

const HAN_RUN = /([　-〿㐀-鿿豈-﫿＀-￯]+(?:[\s…]*[　-〿㐀-鿿豈-﫿＀-￯]+)*)/u;

export function MixedText({ text }: { text: string }) {
  const parts = text.split(HAN_RUN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} lang="zh-Hans" className="zh-inline">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
