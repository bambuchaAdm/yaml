import { source } from 'common-tags'
import * as YAML from '../../index.js'
import { Pair } from '../../types.js'

describe('parse comments', () => {
  describe('body', () => {
    test('directives', () => {
      const src = '#comment\n%YAML 1.2 #comment\n---\nstring\n'
      const doc = YAML.parseDocument(src)
      expect(doc.commentBefore).toBe('comment\ncomment')
      expect(String(doc)).toBe('#comment\n#comment\n\n%YAML 1.2\n---\nstring\n')
    })

    test('body start comments', () => {
      const src = source`
        ---
        #comment
        #comment
        string
      `
      const doc = YAML.parseDocument(src)
      expect(doc.contents.commentBefore).toBe('comment\ncomment')
      expect(String(doc)).toBe(src + '\n')
    })

    test('body start comments with empty comment line', () => {
      const src = source`
        ---
        #comment
        #
        #comment
        string
      `
      const doc = YAML.parseDocument(src)
      expect(doc.contents.commentBefore).toBe('comment\n\ncomment')
      expect(String(doc)).toBe(src + '\n')
    })

    test('body end comments', () => {
      const src = '\nstring\n#comment\n#comment\n'
      const doc = YAML.parseDocument(src)
      expect(doc.comment).toBe('comment\ncomment')
      expect(String(doc)).toBe('string\n\n#comment\n#comment\n')
    })
  })

  describe('top-level scalar comments', () => {
    test('plain', () => {
      const src = '#c0\nvalue #c1\n#c2'
      const doc = YAML.parseDocument(src)
      expect(doc.contents.commentBefore).toBe('c0')
      expect(doc.contents.comment).toBe('c1')
      expect(doc.comment).toBe('c2')
      expect(doc.contents.value).toBe('value')
      expect(doc.contents.range).toMatchObject([4, 14])
    })

    test('"quoted"', () => {
      const src = '#c0\n"value" #c1\n#c2'
      const doc = YAML.parseDocument(src)
      expect(doc.contents.commentBefore).toBe('c0')
      expect(doc.contents.comment).toBe('c1')
      expect(doc.comment).toBe('c2')
      expect(doc.contents.value).toBe('value')
      expect(doc.contents.range).toMatchObject([4, 16])
    })

    test('block', () => {
      const src = '#c0\n>- #c1\n value\n#c2\n'
      const doc = YAML.parseDocument(src)
      expect(doc.contents.commentBefore).toBe('c0')
      expect(doc.contents.comment).toBe('c1')
      expect(doc.comment).toBe('c2')
      expect(doc.contents.value).toBe('value')
      expect(doc.contents.range).toMatchObject([4, 18])
    })
  })

  describe('seq entry comments', () => {
    test('plain', () => {
      const src = `#c0
- value 1
#c1

- value 2

#c2`
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        contents: {
          items: [
            { commentBefore: 'c0', value: 'value 1', comment: 'c1' },
            { value: 'value 2' }
          ],
          range: [4, 29]
        },
        comment: 'c2'
      })
    })

    test('multiline', () => {
      const src = `
- value 1
#c0
#c1

#c2
- value 2

#c3
#c4`
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        contents: {
          items: [{ comment: 'c0\nc1' }, { commentBefore: 'c2' }]
        },
        comment: 'c3\nc4'
      })
    })
  })

  describe('map entry comments', () => {
    test('plain', () => {
      const src = `#c0
key1: value 1
#c1

key2: value 2

#c2`
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        contents: {
          items: [
            { key: { commentBefore: 'c0' }, value: { comment: 'c1' } },
            { key: {}, value: {} }
          ]
        },
        comment: 'c2'
      })
    })

    test('multiline', () => {
      const src = `key1: value 1
#c0
#c1

#c2
key2: value 2

#c3
#c4`
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        contents: {
          items: [
            { value: { comment: 'c0\nc1' } },
            { key: { commentBefore: 'c2' } }
          ]
        },
        comment: 'c3\nc4'
      })
    })
  })

  describe('map-in-seq comments', () => {
    test('plain', () => {
      const src = `#c0
- #c1
  k1: v1
  #c2
  k2: v2 #c3
#c4
  k3: v3
#c5\n`
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        contents: {
          items: [
            {
              commentBefore: 'c0\nc1',
              items: [
                {},
                { commentBefore: 'c2', value: { comment: 'c3' } },
                { commentBefore: 'c4' }
              ]
            }
          ]
        },
        comment: 'c5'
      })
      expect(String(doc)).toBe(`#c0
#c1
- k1: v1
  #c2
  k2: v2 #c3
  #c4
  k3: v3

#c5\n`)
    })
  })

  describe('seq-in-map comments', () => {
    test('plain', () => {
      const src = `#c0
k1: #c1
  - v1
#c2
  - v2
  #c3
k2:
  - v3 #c4
#c5\n`
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        contents: {
          items: [
            {
              key: { commentBefore: 'c0', value: 'k1' },
              value: {
                commentBefore: 'c1',
                items: [{ value: 'v1' }, { commentBefore: 'c2', value: 'v2' }],
                comment: 'c3'
              }
            },
            {
              key: { value: 'k2' },
              value: { items: [{ value: 'v3', comment: 'c4' }] }
            }
          ]
        },
        comment: 'c5'
      })
      expect(String(doc)).toBe(`#c0
k1:
  #c1
  - v1
  #c2
  - v2
  #c3
k2:
  - v3 #c4

#c5\n`)
    })
  })
})

describe('stringify comments', () => {
  describe('single-line comments', () => {
    test('plain', () => {
      const src = 'string'
      const doc = YAML.parseDocument(src)
      doc.contents.comment = 'comment'
      expect(String(doc)).toBe('string #comment\n')
    })

    test('"quoted"', () => {
      const src = '"string\\u0000"'
      const doc = YAML.parseDocument(src)
      doc.contents.comment = 'comment'
      expect(String(doc)).toBe('"string\\0" #comment\n')
    })

    test('block', () => {
      const src = '>\nstring\n'
      const doc = YAML.parseDocument(src)
      doc.contents.comment = 'comment'
      expect(String(doc)).toBe('> #comment\nstring\n')
    })
  })

  describe('multi-line comments', () => {
    test('plain', () => {
      const src = 'string'
      const doc = YAML.parseDocument(src)
      doc.contents.comment = 'comment\nlines'
      expect(String(doc)).toBe('#comment\n#lines\nstring\n')
    })

    test('"quoted"', () => {
      const src = '"string\\u0000"'
      const doc = YAML.parseDocument(src)
      doc.contents.comment = 'comment\nlines'
      expect(String(doc)).toBe('"string\\0"\n#comment\n#lines\n')
    })

    test('block', () => {
      const src = '>\nstring\n'
      const doc = YAML.parseDocument(src)
      doc.contents.comment = 'comment\nlines'
      expect(String(doc)).toBe('> #comment lines\nstring\n')
    })
  })

  describe('document comments', () => {
    test('directive', () => {
      const src = source`
        #c0
        ---
        string
      `
      const doc = YAML.parseDocument(src)
      expect(doc.commentBefore).toBe('c0')
      doc.commentBefore += '\nc1'
      expect(String(doc)).toBe(
        source`
          #c0
          #c1
          ---
          string
        ` + '\n'
      )
    })
  })

  describe('seq comments', () => {
    test('plain', () => {
      const src = '- value 1\n- value 2\n'
      const doc = YAML.parseDocument(src)
      doc.contents.commentBefore = 'c0'
      doc.contents.items[0].commentBefore = 'c1'
      doc.contents.items[1].commentBefore = 'c2'
      doc.contents.comment = 'c3'
      expect(String(doc)).toBe(
        `#c0
#c1
- value 1
#c2
- value 2
#c3
`
      )
    })

    test('multiline', () => {
      const src = '- value 1\n- value 2\n'
      const doc = YAML.parseDocument(src)
      doc.contents.items[0].commentBefore = 'c0\nc1'
      doc.contents.items[1].commentBefore = '\nc2\n\nc3'
      doc.contents.comment = 'c4\nc5'
      expect(String(doc)).toBe(
        `#c0
#c1
- value 1
#
#c2
#
#c3
- value 2
#c4
#c5
`
      )
    })

    test('seq-in-map', () => {
      const src = 'map:\n  - value 1\n  - value 2\n'
      const doc = YAML.parseDocument(src)
      doc.contents.items[0].key.commentBefore = 'c0'
      doc.contents.items[0].key.comment = 'c1'
      doc.contents.items[0].comment = 'c2'
      const seq = doc.contents.items[0].value
      seq.items[0].commentBefore = 'c3'
      seq.items[1].commentBefore = 'c4'
      seq.comment = 'c5'
      expect(String(doc)).toBe(
        `#c0
map: #c1
  #c2
  #c3
  - value 1
  #c4
  - value 2
  #c5\n`
      )
    })
  })

  describe('map entry comments', () => {
    test('plain', () => {
      const src = 'key1: value 1\nkey2: value 2\n'
      const doc = YAML.parseDocument(src)
      doc.contents.items[0].commentBefore = 'c0'
      doc.contents.items[1].commentBefore = 'c1'
      doc.contents.items[1].comment = 'c2'
      doc.contents.items[1].value.spaceBefore = true
      doc.contents.comment = 'c3'
      expect(String(doc)).toBe(`#c0
key1: value 1
#c1
key2: #c2

  value 2
#c3\n`)
    })

    test('multiline', () => {
      const src = 'key1: value 1\nkey2: value 2\n'
      const doc = YAML.parseDocument(src)
      doc.contents.items[0].commentBefore = 'c0\nc1'
      doc.contents.items[1].commentBefore = '\nc2\n\nc3'
      doc.contents.items[1].comment = 'c4\nc5'
      doc.contents.items[1].value.spaceBefore = true
      doc.contents.items[1].value.commentBefore = 'c6'
      doc.contents.comment = 'c7\nc8'
      expect(String(doc)).toBe(
        `#c0
#c1
key1: value 1
#
#c2
#
#c3
key2:
  #c4
  #c5

  #c6
  value 2
#c7
#c8
`
      )
    })
  })
})

describe('blank lines', () => {
  describe('drop leading blank lines', () => {
    test('content', () => {
      const src = '\n\nstr\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('str\n')
    })

    test('content comment', () => {
      const src = '\n\n#cc\n\nstr\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('#cc\n\nstr\n')
    })

    test('directive', () => {
      const src = '\n\n%YAML 1.2\n---\nstr\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('%YAML 1.2\n---\nstr\n')
    })

    test('directive comment', () => {
      const src = '\n\n#cc\n%YAML 1.2\n---\nstr\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('#cc\n\n%YAML 1.2\n---\nstr\n')
    })
  })

  describe('drop trailing blank lines', () => {
    test('empty contents', () => {
      const src = '\n\n\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('null\n')
    })

    test('scalar contents', () => {
      const src = 'str\n\n\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('str\n')
    })

    test('seq contents', () => {
      const src = '- a\n- b\n\n\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('- a\n- b\n')
    })

    test('empty/comment contents', () => {
      const src = '#cc\n\n\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('#cc\n\nnull\n')
    })
  })

  test('between directive comment & directive', () => {
    const src = '#cc\n\n\n%YAML 1.2\n---\nstr\n'
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe('#cc\n\n%YAML 1.2\n---\nstr\n')
  })

  test('after leading comment', () => {
    const src = '#cc\n\n\nstr\n'
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe('#cc\n\nstr\n')
  })

  test('before first node in document with directives', () => {
    const doc = YAML.parseDocument('str\n')
    doc.directivesEndMarker = true
    doc.contents.spaceBefore = true
    expect(String(doc)).toBe('---\n\nstr\n')
  })

  test('between seq items', () => {
    const src = '- a\n\n- b\n\n\n- c\n'
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe('- a\n\n- b\n\n- c\n')
  })

  test('between seq items with leading comments', () => {
    const src = '#A\n- a\n\n#B\n- b\n\n\n#C\n\n- c\n'
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe('#A\n- a\n\n#B\n- b\n\n#C\n- c\n')
  })

  describe('not after block scalar with keep chomping', () => {
    const cases = [
      { name: 'in seq', src: '- |+\n  a\n\n- b\n' },
      { name: 'in map', src: 'a: |+\n  A\n\nb: B\n' },
      { name: 'in seq in map', src: 'a:\n  - |+\n    A\n\nb: B\n' }
    ]
    for (const { name, src } of cases) {
      test(name, () => {
        const doc = YAML.parseDocument(src)
        expect(String(doc)).toBe(src)
        expect(doc.contents.items[1]).not.toHaveProperty('spaceBefore', true)
        doc.contents.items[1].spaceBefore = true
        expect(String(doc)).toBe(src)
      })
    }

    test('as contents', () => {
      const src = '|+\n  a\n\n#c\n'
      const doc = YAML.parseDocument(src)
      expect(doc).toMatchObject({
        comment: 'c',
        contents: { value: 'a\n\n' }
      })
      expect(String(doc)).toBe(src)
    })
  })

  test('before block map values', () => {
    const src = 'a:\n\n  1\nb:\n\n  #c\n  2\n'
    const doc = YAML.parseDocument(src)
    expect(doc.contents).toMatchObject({
      items: [
        {
          key: { value: 'a' },
          value: { value: 1, spaceBefore: true }
        },
        {
          key: { value: 'b' },
          value: { value: 2, commentBefore: 'c', spaceBefore: true }
        }
      ]
    })
    expect(String(doc)).toBe(src)
  })

  describe('after block value', () => {
    test('in seq', () => {
      const src = '- |\n a\n\n- >-\n b\n\n- |+\n c\n\n- d\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe('- |\n  a\n\n- >-\n  b\n\n- |+\n  c\n\n- d\n')
    })

    test('in map', () => {
      const src = 'A: |\n a\n\nB: >-\n b\n\nC: |+\n c\n\nD: d\n'
      const doc = YAML.parseDocument(src)
      expect(String(doc)).toBe(
        'A: |\n  a\n\nB: >-\n  b\n\nC: |+\n  c\n\nD: d\n'
      )
    })
  })

  describe('flow collections', () => {
    test('flow seq', () => {
      const src = '[1,\n\n2,\n3,\n\n4\n\n]'
      const doc = YAML.parseDocument(src)
      expect(doc.contents).toMatchObject({
        items: [
          { value: 1 },
          { value: 2, spaceBefore: true },
          { value: 3 },
          { value: 4, spaceBefore: true }
        ]
      })
      expect(String(doc)).toBe('[\n  1,\n\n  2,\n  3,\n\n  4\n]\n')
    })

    test('flow map', () => {
      const src = '{\n\na: 1,\n\nb: 2 }'
      const doc = YAML.parseDocument(src)
      expect(doc.contents).toMatchObject({
        items: [
          { key: { value: 'a' }, value: { value: 1 }, spaceBefore: true },
          { key: { value: 'b' }, value: { value: 2 }, spaceBefore: true }
        ]
      })
    })

    test('flow map value comments & spaces', () => {
      const src = '{\n  a:\n    #c\n    1,\n  b:\n\n    #d\n    2\n}\n'
      const doc = YAML.parseDocument(src)
      expect(doc.contents).toMatchObject({
        items: [
          {
            key: { value: 'a' },
            value: { value: 1, commentBefore: 'c' }
          },
          {
            key: { value: 'b' },
            value: { value: 2, commentBefore: 'd', spaceBefore: true }
          }
        ]
      })
      expect(String(doc)).toBe(src)
    })
  })

  test('blank line after less-indented comment (eemeli/yaml#91)', () => {
    const src = `
map:
  foo0:
    key2: value2

#   foo1:
#     key0: value0
#     key1: value1

  foo2:
    key3: value3`
    const doc = YAML.parseDocument(src)
    expect(doc.errors).toHaveLength(0)
    expect(doc.toJS()).toMatchObject({
      map: { foo0: { key2: 'value2' }, foo2: { key3: 'value3' } }
    })
  })
})

describe('eemeli/yaml#18', () => {
  test('reported', () => {
    const src = `test1:
  foo:
    #123
    bar: 1\n`
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe(src)
  })

  test('minimal', () => {
    const src = `foo:\n  #123\n  bar: baz\n`
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe(src)
  })
})

describe('eemeli/yaml#28', () => {
  test('reported', () => {
    const src = `# This comment is ok
entryA:
  - foo

entryB:
  - bar # bar comment

# Ending comment
# Ending comment 2\n`
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe(`# This comment is ok
entryA:
  - foo

entryB:
  - bar # bar comment

# Ending comment
# Ending comment 2\n`)
  })

  test('collection end comment', () => {
    const src = `a: b #c\n#d\n`
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe(`a: b #c\n\n#d\n`)
  })

  test('blank line after seq in map', () => {
    const src = `a:
  - aa

b:
  - bb

c: cc\n`
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe(src)
  })

  test('blank line after map in seq', () => {
    const src = `- a: aa

- b: bb
  c: cc

- d: dd\n`
    const doc = YAML.parseDocument(src)
    expect(String(doc)).toBe(src)
  })
})

describe.skip('collection end comments', () => {
  test('seq in seq', () => {
    const src = `#0
- - a
  - b
  #1

#2
- d\n`
    const doc = YAML.parseDocument(src)
    expect(doc.contents).toMatchObject({
      items: [
        { items: [{ value: 'a' }, { value: 'b' }], comment: '1' },
        { spaceBefore: true, commentBefore: '2', value: 'd' }
      ]
    })
    expect(String(doc)).toBe(src)
  })

  test('map in seq', () => {
    const src = `#0
- a: 1
  b: 2
  #1

#2
- d\n`
    const doc = YAML.parseDocument(src)
    expect(doc.contents).toMatchObject({
      items: [
        {
          items: [
            { key: { value: 'a' }, value: { value: 1 } },
            { key: { value: 'b' }, value: { value: 2 } }
          ],
          comment: '1'
        },
        { spaceBefore: true, commentBefore: '2', value: 'd' }
      ]
    })
    expect(String(doc)).toBe(src)
  })

  test('seq in map', () => {
    const src = `#0
a:
  - b
  - c
  #1

#2
d: 1\n`
    const doc = YAML.parseDocument(src)
    expect(doc.contents).toMatchObject({
      items: [
        {
          key: { value: 'a' },
          value: { items: [{ value: 'b' }, { value: 'c' }], comment: '1' }
        },
        {
          spaceBefore: true,
          commentBefore: '2',
          key: { value: 'd' },
          value: { value: 1 }
        }
      ]
    })
    expect(String(doc)).toBe(src)
  })

  test('map in map', () => {
    const src = `#0
a:
  b: 1
  c: 2
  #1

#2
d: 1\n`
    const doc = YAML.parseDocument(src)
    expect(doc.contents).toMatchObject({
      items: [
        {
          key: { value: 'a' },
          value: {
            items: [
              { key: { value: 'b' }, value: { value: 1 } },
              { key: { value: 'c' }, value: { value: 2 } }
            ],
            comment: '1'
          }
        },
        {
          spaceBefore: true,
          commentBefore: '2',
          key: { value: 'd' },
          value: { value: 1 }
        }
      ]
    })
    expect(String(doc)).toBe(src)
  })

  test('indented seq in map in seq', () => {
    const src = `#0
a:
  #1
  - b:
      - c

  #2
  - e\n`
    const doc = YAML.parseDocument(src)
    expect(doc.contents).toMatchObject({
      items: [
        {
          key: { value: 'a' },
          value: {
            commentBefore: '1',
            items: [
              {
                items: [
                  {
                    key: { value: 'b' },
                    value: { items: [{ value: 'c' }] }
                  }
                ]
              },
              { spaceBefore: true, commentBefore: '2', value: 'e' }
            ]
          }
        }
      ]
    })
    expect(String(doc)).toBe(src)
  })
})

describe('Pair.commentBefore', () => {
  test('Should get key comment', () => {
    const key = new YAML.Document().createNode('foo')
    const pair = new Pair(key, 42)
    key.commentBefore = 'cc'
    expect(pair.commentBefore).toBe('cc')
  })

  test('Should set key comment', () => {
    const key = new YAML.Document().createNode('foo')
    const pair = new Pair(key, 42)
    pair.commentBefore = 'cc'
    expect(key.commentBefore).toBe('cc')
  })

  test('Should create a key from a null value', () => {
    const pair = new Pair(null, 42)
    expect(pair.key).toBeNull()
    pair.commentBefore = 'cc'
    expect(pair.key).not.toBeNull()
    expect(pair.key.commentBefore).toBe('cc')
  })

  test('Should throw for non-Node key', () => {
    const pair = new Pair({ foo: 'bar' }, 42)
    expect(() => {
      pair.commentBefore = 'cc'
    }).toThrow(/commentBefore is an alias/)
  })
})
