// Review records in different states so every admin workflow can be explored
// immediately. All people and email addresses are fictional.

const at = (d) => new Date(d).toISOString()

export const accounts = [
  {
    id: 'acc_editor', phone: '+21670000001', city: 'Gabès', country: 'Tunisia', bio: 'Editorial desk of the library.', displayName: 'Library editor', email: 'editor@example.org', role: 'editor', status: 'active', organization: 'A Thousand and One Cities', createdAt: at('2026-09-01T09:00:00Z'),
    // Test password only (see docs/test-accounts.md). Stored as sha256(salt + ':' + password).
    passwordSalt: 'ba8348e98a605348', passwordHash: '16ce14a25c15439325ca494d30c6c1a48eae0e464e6174607553fbcf98110bd0',
  },
  { id: 'acc_amira', phone: '+21620123456', country: 'Tunisia', bio: 'Grew up in the Jara quarter; collects family recipes.', displayName: 'Amira Ben Salem', email: 'amira.bensalem@example.org', role: 'contributor', status: 'active', organization: 'JCI ENIG Gabès Sud', city: 'Gabès', createdAt: at('2026-10-02T10:12:00Z'), passwordSalt: '149339a972603397', passwordHash: '52eae10225e529e68826bde2c2fb9e61d7e8bb97e747fae23bf6ef186ba36369' },
  { id: 'acc_yara', phone: '+963933123456', country: 'Syria', bio: 'Filmmaker on the Latakia corniche.', displayName: 'Yara Haddad', email: 'yara.haddad@example.org', role: 'contributor', status: 'active', organization: 'JCI Syria', city: 'Latakia', createdAt: at('2026-10-05T16:40:00Z'), passwordSalt: '29bad36513257d83', passwordHash: '8f7bb5f678e5623a69bcc18191a536ec227c0f899dd9d55186aeacf79567bffd' },
  { id: 'acc_tarek', phone: '+21698765432', country: 'Tunisia', bio: 'Weekend traveller in the south of Tunisia.', displayName: 'Tarek Mansour', email: 'tarek.mansour@example.org', role: 'contributor', status: 'active', organization: '', city: 'Tunis', createdAt: at('2026-10-19T08:05:00Z'), passwordSalt: '54e9b665c45e2b89', passwordHash: '734f9c8c098b8fab76a81a8355a08639854a6baeb4c2136e35122a0532229cb9' },
  { id: 'acc_lina', phone: '+33612345678', country: 'France', bio: '', displayName: 'Lina Moreau', email: 'lina.moreau@example.org', role: 'contributor', status: 'suspended', organization: '', city: 'Lyon', createdAt: at('2026-10-27T13:30:00Z'), passwordSalt: 'e7565ab6c796aebb', passwordHash: '1672c1e46b8a09a451769266e7f3498200301a256c0f8c14b6d80ffc9cbc11bd' },
]

const story = (o) => ({
  proposedCity: null,
  material: {},
  messages: [],
  notes: [],
  draftPageId: null,
  ...o,
  history: o.history ?? [{ at: o.createdAt, status: 'new', by: o.contributorId }],
  updatedAt: o.updatedAt ?? o.createdAt,
})

export const stories = [
  story({
    id: 'sub_001', contributorId: 'acc_amira', cityId: 'ch_gabes', category: 'taste', format: 'text',
    title: 'Mloukhia on Fridays',
    excerpt: 'The dark, slow-cooked jute-leaf stew my grandmother made every Friday, and why it takes a whole morning.',
    material: { body: 'It starts the night before, when the dried mloukhia powder is sifted and the olive oil is measured by eye.\n\nBy Friday noon the pot is almost black and the whole stairwell smells of it.' },
    status: 'new', createdAt: at('2026-11-21T18:20:00Z'),
  }),
  story({
    id: 'sub_002', contributorId: 'acc_yara', cityId: 'ch_latakia', category: 'listen', format: 'video',
    title: 'The fishermen’s radio at dawn',
    excerpt: 'A short film of the boats coming in to the corniche while an old radio plays on the quay.',
    material: { videoUrl: 'https://www.youtube.com/results?search_query=Latakia+corniche+fishermen' },
    status: 'in_review', createdAt: at('2026-11-18T07:45:00Z'),
    notes: [{ at: at('2026-11-19T09:10:00Z'), author: 'Library editor', text: 'Lovely. Check the music rights before we publish — is it a broadcast?' }],
    history: [
      { at: at('2026-11-18T07:45:00Z'), status: 'new', by: 'acc_yara' },
      { at: at('2026-11-19T09:08:00Z'), status: 'in_review', by: 'acc_editor' },
    ],
  }),
  story({
    id: 'sub_003', contributorId: 'acc_tarek', cityId: null, proposedCity: { city: 'Matmata', country: 'Tunisia' }, category: 'discover', format: 'text',
    title: 'Houses under the ground',
    excerpt: 'Visiting the troglodyte houses of Matmata with a family who still lives in one.',
    material: { body: 'The courtyard is a crater; the rooms open off it like pockets. It stays cool in August.' },
    status: 'changes_requested', createdAt: at('2026-11-10T11:00:00Z'),
    messages: [{ at: at('2026-11-12T15:30:00Z'), from: 'editor', text: 'Thank you! Could you add when you visited and how a visitor can arrange a respectful visit?' }],
    history: [
      { at: at('2026-11-10T11:00:00Z'), status: 'new', by: 'acc_tarek' },
      { at: at('2026-11-12T15:30:00Z'), status: 'changes_requested', by: 'acc_editor' },
    ],
  }),
  story({
    id: 'sub_004', contributorId: 'acc_amira', cityId: 'ch_gabes', category: 'experience', format: 'text',
    title: 'Haggling for henna',
    excerpt: 'How the stallholders of Jara test a sack of henna — and how to ask without offending anyone.',
    material: { body: 'Rub a pinch between your fingers: good henna turns your skin faintly green and smells of hay.\n\nAsk for the third cutting and wait for the story that comes with it.' },
    status: 'accepted', createdAt: at('2026-11-04T09:30:00Z'),
    history: [
      { at: at('2026-11-04T09:30:00Z'), status: 'new', by: 'acc_amira' },
      { at: at('2026-11-06T10:00:00Z'), status: 'accepted', by: 'acc_editor' },
    ],
  }),
  story({
    id: 'sub_005', contributorId: 'acc_amira', cityId: 'ch_gabes', category: 'discover', format: 'text',
    title: 'Low tide',
    excerpt: 'When the gulf pulls back and the beach becomes a second field.',
    material: { body: 'At low tide the gulf pulls back so far that the shore becomes a second field.' },
    status: 'accepted', draftPageId: 'pg_gabes_lowtide', createdAt: at('2026-10-28T14:00:00Z'),
    history: [
      { at: at('2026-10-28T14:00:00Z'), status: 'new', by: 'acc_amira' },
      { at: at('2026-10-30T08:20:00Z'), status: 'accepted', by: 'acc_editor' },
    ],
  }),
  story({
    id: 'sub_006', contributorId: 'acc_tarek', cityId: 'ch_latakia', category: 'taste', format: 'text',
    title: 'Ice cream by the harbour',
    excerpt: 'A list of ice-cream shops along the corniche.',
    material: { body: 'Three shops, three flavours each.' },
    status: 'declined', createdAt: at('2026-10-20T19:00:00Z'),
    messages: [{ at: at('2026-10-22T09:00:00Z'), from: 'editor', text: 'We are keeping chapters to personal stories rather than shop lists. We would love a memory from one of these places instead.' }],
    history: [
      { at: at('2026-10-20T19:00:00Z'), status: 'new', by: 'acc_tarek' },
      { at: at('2026-10-22T09:00:00Z'), status: 'declined', by: 'acc_editor' },
    ],
  }),
]

const suggestion = (o) => ({ contributorId: null, links: [], messages: [], notes: [], draftChapterId: null, ...o, history: o.history ?? [{ at: o.createdAt, status: 'new', by: o.contributorId ?? 'visitor' }], updatedAt: o.updatedAt ?? o.createdAt })

export const suggestions = [
  suggestion({
    id: 'sug_001', contributorId: 'acc_tarek', reporter: { name: 'Tarek Mansour', email: 'tarek.mansour@example.org', organization: '' },
    city: 'Fes', country: 'Morocco',
    reason: 'The medina is the largest car-free urban area in the world, and every tannery family has a story about the colours.',
    links: ['https://en.wikipedia.org/wiki/Fez,_Morocco'], status: 'new', createdAt: at('2026-11-22T12:00:00Z'),
  }),
  suggestion({
    id: 'sug_002', reporter: { name: 'Joseph Camilleri', email: 'joseph.camilleri@example.org', organization: 'Local heritage club' },
    city: 'Valletta', country: 'Malta',
    reason: 'A capital you can cross on foot in twenty minutes, with festa traditions in every parish.',
    status: 'needs_info', createdAt: at('2026-11-15T17:45:00Z'),
    messages: [{ at: at('2026-11-17T08:30:00Z'), from: 'editor', text: 'Would your club be able to contribute the first three stories?' }],
    history: [
      { at: at('2026-11-15T17:45:00Z'), status: 'new', by: 'visitor' },
      { at: at('2026-11-17T08:30:00Z'), status: 'needs_info', by: 'acc_editor' },
    ],
  }),
  suggestion({
    id: 'sug_003', contributorId: 'acc_amira', reporter: { name: 'Amira Ben Salem', email: 'amira.bensalem@example.org', organization: 'JCI ENIG Gabès Sud' },
    city: 'Tozeur', country: 'Tunisia',
    reason: 'An oasis town built in patterned brick, at the edge of the salt lake. A natural second chapter for the Tunisia volume.',
    status: 'accepted', createdAt: at('2026-11-08T10:15:00Z'),
    history: [
      { at: at('2026-11-08T10:15:00Z'), status: 'new', by: 'acc_amira' },
      { at: at('2026-11-09T16:00:00Z'), status: 'accepted', by: 'acc_editor' },
    ],
  }),
  suggestion({
    id: 'sug_004', reporter: { name: 'Nour Khoury', email: 'nour.khoury@example.org', organization: '' },
    city: 'Byblos', country: 'Lebanon',
    reason: 'One of the oldest continuously inhabited cities, with a harbour that still feels like a village in winter.',
    status: 'in_review', createdAt: at('2026-11-19T21:10:00Z'),
    notes: [{ at: at('2026-11-20T09:00:00Z'), author: 'Library editor', text: 'Needs a Lebanon volume and an Asia shelf entry. Ask JCI Lebanon?' }],
    history: [
      { at: at('2026-11-19T21:10:00Z'), status: 'new', by: 'visitor' },
      { at: at('2026-11-20T09:00:00Z'), status: 'in_review', by: 'acc_editor' },
    ],
  }),
]

export const messages = [
  { id: 'msg_001', sender: { name: 'Salma Gharbi', email: 'salma.gharbi@example.org' }, accountId: null, subject: 'A school project in Gabès', message: 'Our secondary school would like its students to write stories about the oasis. Is there a way for a class to contribute together?', status: 'new', notes: [], replyDraft: null, createdAt: at('2026-11-23T08:40:00Z'), updatedAt: at('2026-11-23T08:40:00Z') },
  { id: 'msg_002', sender: { name: 'Marc Vidal', email: 'marc.vidal@example.org' }, accountId: null, subject: 'Photo credit on the Latakia page', message: 'The harbour print on the Latakia chapter — is it the 1810 Mayer aquatint? It might be worth adding the book title.', status: 'new', notes: [], replyDraft: null, createdAt: at('2026-11-22T19:05:00Z'), updatedAt: at('2026-11-22T19:05:00Z') },
  { id: 'msg_003', sender: { name: 'Yara Haddad', email: 'yara.haddad@example.org' }, accountId: 'acc_yara', subject: 'Uploading longer videos', message: 'Some of our films are ten minutes long. Can we upload them directly?', status: 'open', notes: [{ at: at('2026-11-20T10:00:00Z'), author: 'Library editor', text: 'Policy: video stays on YouTube / Reels, we only link.' }], replyDraft: { text: 'Hi Yara, thank you for the films! The library links to videos rather than hosting them: upload to YouTube (unlisted is fine) and paste the link in the story form.', updatedAt: at('2026-11-20T10:05:00Z') }, createdAt: at('2026-11-19T22:30:00Z'), updatedAt: at('2026-11-20T10:05:00Z') },
  { id: 'msg_004', sender: { name: 'Hédi Ferchichi', email: 'hedi.ferchichi@example.org' }, accountId: null, subject: 'Thank you', message: 'I found the Gabès chapter through Instagram — the oasis photographs brought back my childhood.', status: 'resolved', notes: [], replyDraft: null, createdAt: at('2026-11-14T12:00:00Z'), updatedAt: at('2026-11-15T09:00:00Z') },
]

export const activity = [
  { id: 'act_001', at: at('2026-11-23T08:40:00Z'), actor: 'Salma Gharbi', verb: 'sent a message', target: { kind: 'message', id: 'msg_001', label: 'A school project in Gabès' } },
  { id: 'act_002', at: at('2026-11-22T12:00:00Z'), actor: 'Tarek Mansour', verb: 'suggested a city', target: { kind: 'suggestion', id: 'sug_001', label: 'Fes, Morocco' } },
  { id: 'act_003', at: at('2026-11-21T18:20:00Z'), actor: 'Amira Ben Salem', verb: 'shared a story', target: { kind: 'story', id: 'sub_001', label: 'Mloukhia on Fridays' } },
  { id: 'act_004', at: at('2026-11-19T09:08:00Z'), actor: 'Library editor', verb: 'started reviewing', target: { kind: 'story', id: 'sub_002', label: 'The fishermen’s radio at dawn' } },
  { id: 'act_005', at: at('2026-11-09T16:00:00Z'), actor: 'Library editor', verb: 'accepted', target: { kind: 'suggestion', id: 'sug_003', label: 'Tozeur, Tunisia' } },
]
