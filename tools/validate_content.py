import sys,re,json,os
from pypinyin import lazy_pinyin
B=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
vocab=json.load(open(os.path.join(B,'tools/data/vocab_level2.json')))
lmap=json.load(open(os.path.join(B,'tools/data/lesson_map.json')))
lv1=set(json.load(open(os.path.join(B,'tools/data/level1_chars.json'))))|set('呢吧啊钟三四五六七八十零站面白绿级第页酒啤城市租铁哦嗯呀')
NAMES=set('林月马克安娜陈乐旁白房东')
han=lambda s:[c for c in s if '一'<=c<='鿿']
def strip_tone(s):
    t=str.maketrans('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü','aaaaeeeeiiiioooouuuuvvvvv'); return s.lower().translate(t)
def rows(block):
    out=[]
    for l in block.splitlines():
        if l.startswith('|') and not re.match(r'^\|[\s\-|:]+\|$',l):
            out.append([c.strip() for c in l.strip().strip('|').split('|')])
    return out[1:] if out else []
def check(path):
    E=[];W=[]; txt=open(path,encoding='utf-8').read()
    m=re.match(r'---\n(.*?)\n---\n',txt,re.S)
    if not m: E.append('missing frontmatter'); return E,W
    fm=dict(l.split(': ',1) for l in m.group(1).splitlines() if ': ' in l)
    for k in ['id','level','lesson','title_en','title_zh','book','book_pages']:
        if k not in fm: E.append('frontmatter missing '+k)
    lid=fm.get('id','')
    if lid not in vocab: E.append('bad id '+lid); return E,W
    n=int(lid[1:]); known=set(lv1)|NAMES
    for k in range(11,n+1):
        for p in vocab['L%d'%k].values():
            for v in p: known.update(han(v['hanzi']))
    for g in lmap[lid]['grammar']: known.update(han(g))
    h2=re.findall(r'^## (.+)$',txt,re.M)
    want=['Objectives','Book reference','Vocabulary','Grammar','Dialogues','Exercises','Speaking prompts']
    if h2!=want: E.append('H2 sections are %s, expected %s'%(h2,want))
    sec={}
    parts=re.split(r'^## (.+)$',txt,flags=re.M)
    for i in range(1,len(parts),2): sec[parts[i]]=parts[i+1]
    def sub(s): 
        p=re.split(r'^### (.+)$',s,flags=re.M); return [(p[i],p[i+1]) for i in range(1,len(p),2)]
    # book ref
    br=rows(sec.get('Book reference',''))
    if [r[0] for r in br]!=list(lmap[lid]['refs']) or [r[1] for r in br]!=[str(x) for x in lmap[lid]['refs'].values()]: E.append('Book reference table does not match lesson_map refs')
    # vocab
    vs=sub(sec.get('Vocabulary',''))
    if [t for t,_ in vs]!=['Part 1','Part 2']: E.append('Vocabulary needs ### Part 1 and ### Part 2')
    num=0
    for (t,b),pk in zip(vs,['part1','part2']):
        r=rows(b); exp=vocab[lid][pk]
        if len(r)!=len(exp): E.append('%s: %d rows, expected %d'%(t,len(r),len(exp)))
        for row,e in zip(r,exp):
            num+=1
            if len(row)!=5: E.append('%s row needs 5 cells: %s'%(t,row)); continue
            if row[0]!=str(num): E.append('%s numbering: got %s expected %d'%(t,row[0],num))
            if row[1]!=e['hanzi'] or row[2]!=e['pinyin']: E.append('%s row %d should be %s %s, got %s %s'%(t,num,e['hanzi'],e['pinyin'],row[1],row[2]))
            if not re.fullmatch(r'[a-z]+(/[a-z]+)*',row[3]): E.append('%s row %d bad POS %r'%(t,num,row[3]))
    def pycheck(zh,py,where):
        hz=han(zh)
        for c in hz:
            if c not in known: W.append('%s: character %s not in known vocabulary: %s'%(where,c,zh))
        syl=re.findall(r"[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+",py.lower())
        got=''.join(strip_tone(s) for s in syl); exp=''.join(strip_tone(s) for s in lazy_pinyin(''.join(hz))).replace('ü','v')
        got=got.replace('u:','v')
        if got!=exp:
            # allow erhua (er->r) and common polyphones by reporting only
            if got.replace('r','')!=exp.replace('er','').replace('r',''): W.append('%s: pinyin letters differ from dictionary reading. zh=%s | yours=%s | dict=%s'%(where,zh,got,exp))
        if re.search(r'\d',py): E.append('%s: tone numbers in pinyin: %s'%(where,py))
        if hz and not re.search('[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]',py): E.append('%s: pinyin has no tone marks: %s'%(where,py))
    # grammar
    gs=sub(sec.get('Grammar','')); exp=lmap[lid]['grammar']
    if len(gs)!=len(exp): E.append('Grammar: %d blocks, expected %d'%(len(gs),len(exp)))
    for i,((t,b),e) in enumerate(zip(gs,exp),1):
        if t.strip()!='G%d · %s'%(i,e): E.append('Grammar heading should be "G%d · %s", got "%s"'%(i,e,t))
        if '**Pattern:** `' not in b: E.append('G%d missing **Pattern:** `…`'%i)
        r=rows(b)
        if not 3<=len(r)<=4: E.append('G%d needs 3-4 example rows, has %d'%(i,len(r)))
        for row in r:
            if len(row)!=3: E.append('G%d example needs 3 cells: %s'%(i,row)); continue
            pycheck(row[0],row[1],'G%d'%i)
        prose=re.sub(r'\|.*','',b); 
        if len(prose.split())<25: E.append('G%d explanation too short'%i)
    # dialogues
    ds=sub(sec.get('Dialogues',''))
    if len(ds)!=2 or not all(re.match(r'Dialogue %d · .+'%(i+1),t) for i,(t,_) in enumerate(ds)): E.append('Need "### Dialogue 1 · …" and "### Dialogue 2 · …"')
    for t,b in ds:
        if '*Setting:' not in b: E.append(t+': missing *Setting: …* line')
        r=rows(b)
        if not 8<=len(r)<=12: E.append('%s: %d turns, need 8-12'%(t,len(r)))
        for row in r:
            if len(row)!=4: E.append('%s row needs 4 cells: %s'%(t,row)); continue
            pycheck(row[1],row[2],t.split(' ·')[0])
    # exercises
    es=sub(sec.get('Exercises','')); types=['choice','order','translate','match']; counts=[5,5,5,8]
    if len(es)!=4: E.append('Exercises: need 4 sets, have %d'%len(es))
    for (t,b),ty,cn in zip(es,types,counts):
        if '{type=%s}'%ty not in t: E.append('Exercise heading "%s" should contain {type=%s}'%(t,ty))
        items=[l for l in b.splitlines() if re.match(r'^\d+\. ',l)]
        if len(items)!=cn: E.append('%s: %d items, need %d'%(ty,len(items),cn))
        for l in items:
            body=re.sub(r'^\d+\. ','',l)
            if body.count('→')!=1: E.append('%s: need exactly one → : %s'%(ty,l)); continue
            q,a=[x.strip() for x in body.split('→')]
            for c in han(q+a):
                if c not in known: W.append('%s: character %s not in known vocabulary: %s'%(ty,c,l))
            if ty=='choice':
                mm=re.search(r'\[(.+?)\]',q)
                if q.count('___')!=1 or not mm: E.append('choice: needs one ___ and [a | b | c]: '+l); continue
                opts=[o.strip() for o in mm.group(1).split('|')]
                if len(opts)!=3 or a not in opts: E.append('choice: 3 options and answer must be one of them: '+l)
            if ty=='order':
                ch=[c.strip() for c in q.split(' / ')]
                if len(ch)<3: E.append('order: needs >=3 chunks: '+l)
                if sorted(''.join(ch))!=sorted(re.sub(r'[。？！，、,.?!\s]','',a)): E.append('order: chunks do not rebuild the answer: '+l)
            if ty=='match':
                allv=[v['hanzi'] for p in vocab[lid].values() for v in p]
                if q not in allv: E.append('match: %s is not a vocabulary item of this lesson'%q)
    sp=rows(sec.get('Speaking prompts',''))
    if len(sp)!=4: E.append('Speaking prompts: need 4 rows, have %d'%len(sp))
    for row in sp:
        if len(row)==3: pycheck(row[0],row[1],'Speaking')
        else: E.append('Speaking row needs 3 cells')
    if not re.search(r'^# Lesson %d · %s · %s$'%(n,re.escape(lmap[lid]['title_zh']),re.escape(lmap[lid]['title_en'])),txt,re.M): E.append('H1 should be "# Lesson %d · %s · %s"'%(n,lmap[lid]['title_zh'],lmap[lid]['title_en']))
    for bad in ['王朋','李友','高文中','白英爱','高小音','常老师','王红','海伦','费先生']:
        if bad in re.sub(r'## Vocabulary.*?## Grammar','',txt,flags=re.S): E.append('textbook character name used: '+bad)
    return E,W
if __name__=='__main__':
    bad=0
    for p in sys.argv[1:]:
        E,W=check(p); print('==',os.path.basename(p),'%d ERROR, %d WARN'%(len(E),len(W)))
        for e in E: print('  ERROR',e)
        for w in W: print('  WARN ',w)
        bad+=len(E)
    sys.exit(1 if bad else 0)
