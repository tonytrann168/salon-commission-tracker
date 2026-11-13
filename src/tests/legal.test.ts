import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Story 031: the privacy and terms pages say what they must, in English and Vietnamese. */

const page = (name: string): { en: string; vi: string } => {
  const html = readFileSync(new URL(`../public/${name}.html`, import.meta.url), 'utf8');
  const section = (id: string): string => html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))?.[0] ?? '';
  return { en: section('en'), vi: section('vi') };
};

describe('privacy page', () => {
  const { en, vi } = page('privacy');
  it('names what is stored, what the AI gets, deletion, contact and no payments (English)', () => {
    for (const topic of [/on your phone/i, /email address/i, /password/i, /hashed/i, /game progress/i, /feedback/i, /only\*?\*?<\/strong> if you choose/i, /AI service/i, /never receives your email/i, /Delete my account/i, /no payments/i, /OWNER-EMAIL/, /do not sell/i]) expect(en).toMatch(topic);
  });
  it('says the same in Vietnamese', () => {
    for (const topic of [/điện thoại/, /email/, /mật khẩu/, /tiến độ chơi/, /góp ý/, /dịch vụ AI/, /không bao giờ nhận email/, /Xoá tài khoản/, /không có bất kỳ khoản thanh toán/, /OWNER-EMAIL/, /không bán/]) expect(vi).toMatch(topic);
  });
});

describe('terms page', () => {
  const { en, vi } = page('terms');
  it('covers free play, practice only, AI mistakes, fair use, changes and contact in both languages', () => {
    for (const topic of [/Free to play/, /practice game/i, /AI can be wrong/, /harass/, /Changes/, /OWNER-EMAIL/]) expect(en).toMatch(topic);
    for (const topic of [/miễn phí/, /luyện tập/, /AI có thể sai/, /quấy rối/, /Thay đổi/, /OWNER-EMAIL/]) expect(vi).toMatch(topic);
  });
});
