import sys,re,os,glob
def load(c):
    r=[]
    for f in sorted(glob.glob(f'corpus/{c}/*.txt')):
        t=open(f,encoding='utf-8',errors='replace').read()
        r.append((t.split('\n',1)[0][5:],re.sub(r'\s+',' ',t.split('\n',1)[1] if '\n' in t else '')))
    return r
w=int(sys.argv[1]); n=int(sys.argv[2])
for spec in sys.argv[3:]:
    c,pat=spec.split('::',1); k=0
    print(f'## {c} :: {pat[:50]}')
    for url,b in load(c):
        last=-9999
        for m in re.finditer(pat,b):
            if m.start()-last<w*2: continue
            sn=b[max(0,m.start()-w):m.end()+w]
            if sn.count('?')>=2: continue
            last=m.start(); k+=1
            if k<=n: print('  <'+url[-60:]+'> …'+sn+'…')
    if k==0: print('  (aucun)')
