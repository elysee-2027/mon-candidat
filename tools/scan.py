import sys,re,glob
P={"q01":r"\bISF\b|impôt sur la fortune|Zucman|grandes fortunes|ultra-riches","q02":r"dépenses? publiques?|fonctionnaires|économies? budgétaires","q03":r"retraite","q04":r"\bSMIC\b|\bSmic\b|salaire minimum","q05":r"nucléaire|\bEPR","q06":r"éolien|renouvelable|photovolta|solaire","q07":r"Union européenne|\bUE\b|Frexit|traités européens|Commission européenne","q08":r"Ukrain","q09":r"immigration","q10":r"préférence nationale|priorité nationale","q11":r"peines? planchers?","q12":r"prison|carcéral","q13":r"fin de vie|euthanasie|aide à mourir|suicide assisté","q14":r"voile|laïcité|signes religieux","q15":r"proportionnelle","q16":r"\bRIC\b|référendum d.initiative","q17":r"impôts? de production|\bCVAE\b|charges sociales|cotisations patronales","q18":r"succession|héritage","q19":r"capitalisation","q20":r"chômage","q21":r"thermique|2035","q22":r"\bZFE\b|faibles émissions","q23":r"\bOTAN\b","q24":r"défense européenne|armée européenne|Europe de la défense","q25":r"régularis|sans-papiers","q26":r"droit du sol","q27":r"majorité pénale|excuse de minorité|mineurs délinquants","q28":r"aménagements? de peine|réductions? de peine","q29":r"service national|service militaire","q30":r"\bGPA\b|gestation pour autrui","q31":r"49[.-]3","q32":r"révision de la Constitution|modifier la Constitution|Constitution","q33":r"nationalis","q34":r"protectionnisme|droits de douane|libre-échange","q35":r"audiovisuel public","q36":r"déserts? médica|installation des médecins","q37":r"\bSRU\b|logements? sociaux","q38":r"35 ?heures|32 ?heures|temps de travail","q39":r"pesticide|glyphosate","q40":r"\bDPE\b|passoires","q41":r"avion|aérien|kérosène","q42":r"\bCEDH\b|Cour européenne des droits","q43":r"Schengen|frontières","q44":r"Mercosur","q45":r"\bAME\b|aide médicale","q46":r"rétention|\bCRA\b|expuls","q47":r"asile","q48":r"drogue|cannabis|stupéfiant","q49":r"vidéo|reconnaissance faciale","q50":r"\bLBD\b|maintien de l.ordre","q51":r"redoublement|collège unique","q52":r"uniforme","q53":r"décentralisation","q54":r"départements?|régions","q55":r"septennat|mandat unique","q56":r"réseaux sociaux|écrans"}
c=sys.argv[1]; w=int(sys.argv[2]) if len(sys.argv)>2 else 110; only=sys.argv[3].split(',') if len(sys.argv)>3 else None
docs=[]
for f in glob.glob(f'corpus/{c}/*.txt'):
    t=open(f,encoding='utf-8',errors='replace').read(); docs.append((t.split('\n',1)[0][5:],re.sub(r'\s+',' ',t.split('\n',1)[1] if '\n' in t else '')))
for q,p in P.items():
    if only and q not in only: continue
    hits=[]
    for u,b in docs:
        for m in re.finditer(p,b):
            hits.append(b[max(0,m.start()-w):m.end()+w]); 
            if len(hits)>=2: break
        if len(hits)>=2: break
    if hits: print(q,'|',' ‖ '.join(h for h in hits))
