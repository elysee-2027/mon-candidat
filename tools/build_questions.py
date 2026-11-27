"""Reconstruit data/questions.json en séries de 8 questions (une par thème et par série).

Usage : python3 tools/build_questions.py
Les 16 premières questions sont déjà dans data/questions.json ; les suivantes sont définies ici.
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
Q = {q["id"]: q for q in json.load(open(root / "data/questions.json", encoding="utf-8"))}

new = [
    ("q17", "eco", 1, "Il faut poursuivre la baisse des impôts de production payés par les entreprises.", "Ces impôts s'appliquent à l'activité des entreprises, indépendamment de leurs bénéfices. La CVAE en est un exemple."),
    ("q18", "eco", 1, "Les droits de succession doivent être supprimés ou fortement réduits.", "Ils s'appliquent aux transmissions de patrimoine après un décès, avec des abattements selon le lien de parenté."),
    ("q19", "social", 1, "Une partie des pensions de retraite doit reposer sur la capitalisation.", "Le système actuel fonctionne par répartition : les cotisations des actifs financent les pensions en cours."),
    ("q20", "social", 1, "Les règles d'indemnisation du chômage doivent être durcies.", "Plusieurs réformes ont modifié ces dernières années les conditions et la durée d'indemnisation."),
    ("q21", "ecologie", 1, "L'interdiction de vendre des voitures thermiques neuves en 2035 doit être supprimée ou repoussée.", "Cette échéance a été fixée au niveau européen ; son maintien fait débat."),
    ("q22", "ecologie", 1, "Les zones à faibles émissions (ZFE) doivent être supprimées.", "Les ZFE limitent la circulation des véhicules les plus polluants dans certaines agglomérations."),
    ("q23", "europe", -1, "La France doit sortir du commandement intégré de l'OTAN.", "La France l'avait quitté en 1966 et y est revenue en 2009."),
    ("q24", "europe", 1, "La défense de la France doit être davantage organisée avec ses partenaires européens.", "Par exemple : achats d'armement communs, protection antimissile ou dissuasion nucléaire."),
    ("q25", "immigration", -1, "Les travailleurs sans papiers doivent pouvoir être régularisés.", "Aujourd'hui, la régularisation relève d'une décision du préfet, au cas par cas."),
    ("q26", "immigration", 1, "Le droit du sol doit être supprimé ou restreint.", "Un enfant né en France de parents étrangers peut acquérir la nationalité française, sous conditions notamment de résidence."),
    ("q27", "securite", 1, "L'âge de la majorité pénale doit être abaissé à 16 ans.", "Les mineurs relèvent aujourd'hui d'un régime de justice spécifique jusqu'à 18 ans, avec une atténuation de peine possible dès 13 ans."),
    ("q28", "securite", 1, "Les aménagements et réductions de peine doivent être fortement limités.", "Ils permettent d'exécuter une peine autrement qu'en détention ou d'en réduire la durée."),
    ("q29", "societe", 1, "Un service national doit être rétabli pour les jeunes.", "Le service militaire obligatoire a été suspendu en 1997 ; un service national universel volontaire a été expérimenté."),
    ("q30", "societe", 1, "La gestation pour autrui (GPA) doit rester interdite en France.", "La GPA est interdite en France ; certains pays l'autorisent."),
    ("q31", "institutions", -1, "L'article 49.3 de la Constitution doit être supprimé.", "Il permet au gouvernement de faire adopter un texte sans vote, sauf motion de censure."),
    ("q32", "institutions", -1, "Toute révision de la Constitution doit être soumise à référendum.", "Une révision peut aujourd'hui être adoptée par le Parlement réuni en Congrès, sans référendum."),
    ("q33", "eco", -1, "L'État doit nationaliser certaines entreprises stratégiques (banques, énergie, autoroutes…).", "L'État est déjà actionnaire de plusieurs grandes entreprises ; les autoroutes sont exploitées par des sociétés privées sous concession."),
    ("q34", "eco", -1, "La France et l'Union européenne doivent relever leurs droits de douane pour protéger la production locale.", "Les droits de douane sont fixés au niveau européen."),
    ("q35", "eco", 1, "L'audiovisuel public doit être privatisé.", "Il comprend notamment France Télévisions et Radio France, financés par l'État."),
    ("q36", "social", -1, "L'installation des médecins doit être régulée là où ils sont déjà nombreux.", "Les médecins libéraux choisissent aujourd'hui librement leur lieu d'installation."),
    ("q37", "social", -1, "Les obligations de logements sociaux imposées aux communes (loi SRU) doivent être maintenues ou renforcées.", "La loi SRU impose à certaines communes un taux minimal de logements sociaux, de 20 ou 25 %."),
    ("q38", "social", 1, "La durée légale du travail (35 heures) doit être allongée ou laissée à la négociation dans chaque entreprise.", "Les heures au-delà de 35 heures par semaine sont aujourd'hui des heures supplémentaires majorées."),
    ("q39", "ecologie", -1, "L'usage des pesticides doit être davantage restreint, même si cela crée des contraintes pour les agriculteurs.", "Certaines substances sont interdites en France mais autorisées dans d'autres pays européens."),
    ("q40", "ecologie", -1, "L'interdiction progressive de louer les logements les plus énergivores (passoires thermiques) doit être maintenue.", "Elle s'appuie sur le diagnostic de performance énergétique (DPE)."),
    ("q41", "ecologie", -1, "Le transport aérien doit être davantage taxé ou limité, par exemple pour les vols intérieurs.", "Le kérosène des vols commerciaux n'est pas taxé comme les carburants routiers."),
    ("q42", "europe", 1, "La France doit pouvoir s'affranchir des décisions de la Cour européenne des droits de l'homme, voire quitter cette convention.", "La CEDH relève du Conseil de l'Europe, et non de l'Union européenne."),
    ("q43", "europe", 1, "La France doit rétablir des contrôles permanents à toutes ses frontières, y compris avec ses voisins européens.", "Dans l'espace Schengen, les contrôles aux frontières intérieures ne sont en principe que temporaires."),
    ("q44", "europe", 1, "La France doit s'opposer à l'accord de libre-échange entre l'Union européenne et le Mercosur.", "Cet accord concerne l'Argentine, le Brésil, le Paraguay et l'Uruguay."),
    ("q45", "immigration", 1, "L'aide médicale d'État (AME) doit être supprimée ou limitée aux soins urgents.", "L'AME prend en charge les soins des étrangers en situation irrégulière, sous conditions de ressources et de résidence."),
    ("q46", "immigration", 1, "Il faut construire plus de centres de rétention et allonger la durée de rétention des étrangers en situation irrégulière.", "La rétention permet de garder un étranger le temps d'organiser son éloignement, pour une durée limitée par la loi."),
    ("q47", "immigration", 1, "L'accès à l'asile en France doit être nettement restreint.", "L'asile protège les personnes persécutées ; les conditions de dépôt et d'examen des demandes font débat."),
    ("q48", "securite", 1, "Les consommateurs de drogue doivent être sanctionnés plus sévèrement.", "L'usage de stupéfiants est un délit, souvent sanctionné par une amende forfaitaire."),
    ("q49", "securite", 1, "La police doit pouvoir utiliser la vidéoprotection assistée par intelligence artificielle.", "Son usage est strictement encadré ; la reconnaissance faciale en temps réel dans l'espace public n'est pas autorisée."),
    ("q50", "securite", -1, "L'usage des lanceurs de balles de défense (LBD) et des grenades par la police doit être interdit ou fortement restreint.", "Ces armes sont utilisées notamment lors des manifestations."),
    ("q51", "societe", 1, "L'école doit redevenir plus sélective : redoublement, fin du collège unique, exigence renforcée.", "Le collège unique accueille tous les élèves dans un même cursus jusqu'à la troisième."),
    ("q52", "societe", 1, "L'uniforme doit être instauré à l'école.", "Il a fait l'objet d'expérimentations dans certains établissements."),
    ("q53", "institutions", -1, "Il faut transférer davantage de compétences de l'État vers les collectivités locales.", "Communes, départements et régions exercent déjà des compétences définies par la loi."),
    ("q54", "institutions", -1, "Il faut supprimer un échelon de collectivités, par exemple en fusionnant départements et régions.", "La France compte des communes, des intercommunalités, des départements et des régions."),
    ("q55", "institutions", -1, "Le président doit être élu pour un mandat unique ou plus long, comme un septennat.", "Le président est élu pour cinq ans, renouvelable une fois."),
    ("q56", "societe", 1, "Les réseaux sociaux doivent être interdits aux moins de 15 ans.", "Une loi de 2023 a fixé une « majorité numérique » à 15 ans, mais son application reste incomplète."),
    ("q57", "eco", -1, "Les aides publiques aux entreprises doivent être conditionnées à des engagements (emploi, salaires, climat).", "Subventions, exonérations et crédits d'impôt aux entreprises représentent des dizaines de milliards d'euros par an."),
    ("q58", "eco", -1, "Il faut taxer davantage les dividendes et les superprofits des grandes entreprises.", "Pour les particuliers, les dividendes sont aujourd'hui soumis à un prélèvement forfaitaire unique (« flat tax »)."),
    ("q59", "eco", 1, "Une « règle d'or » limitant le déficit public doit être inscrite dans la Constitution.", "Les règles budgétaires européennes fixent déjà des plafonds de déficit et de dette."),
    ("q60", "social", -1, "Les loyers doivent être encadrés, voire gelés, dans les zones où le logement est cher.", "L'encadrement des loyers s'applique aujourd'hui dans certaines villes volontaires, à titre expérimental."),
    ("q61", "social", 1, "Des jours de carence doivent s'appliquer à tous les arrêts maladie, dans le privé comme dans le public.", "Les jours de carence sont des jours d'arrêt maladie non indemnisés ; leur nombre diffère entre public et privé."),
    ("q62", "social", -1, "Les dépassements d'honoraires des médecins doivent être fortement encadrés.", "Certains médecins sont autorisés à facturer au-delà du tarif de la Sécurité sociale."),
    ("q63", "ecologie", 1, "Il faut prolonger la durée de vie des réacteurs nucléaires existants.", "Les réacteurs actuels ont été conçus pour environ 40 ans ; leur prolongation est examinée par l'Autorité de sûreté nucléaire."),
    ("q64", "ecologie", 1, "L'objectif de « zéro artificialisation nette » des sols (ZAN) doit être assoupli ou supprimé.", "La loi Climat et résilience de 2021 vise à ne plus consommer, en net, d'espaces naturels d'ici 2050."),
    ("q65", "ecologie", 1, "Il faut développer les réserves d'eau pour l'irrigation agricole, y compris les « méga-bassines ».", "Ces retenues stockent de l'eau prélevée en hiver pour l'irrigation estivale ; elles sont contestées."),
    ("q66", "europe", 1, "La France doit sortir de l'euro.", "La France partage l'euro avec une vingtaine d'autres pays de l'Union européenne depuis 2002."),
    ("q67", "europe", 1, "La dissuasion nucléaire française doit aussi contribuer à protéger nos partenaires européens.", "La décision d'emploi de l'arme nucléaire relève du seul président de la République."),
    ("q68", "europe", 1, "La contribution de la France au budget de l'Union européenne doit être réduite ou conditionnée.", "La France verse au budget européen plus qu'elle n'en reçoit."),
    ("q69", "immigration", 1, "Le regroupement familial doit être suspendu ou fortement restreint.", "Il permet à un étranger installé régulièrement de faire venir sa famille, sous conditions de ressources et de logement."),
    ("q70", "immigration", 1, "Les étrangers condamnés pour des délits graves doivent être expulsés systématiquement.", "L'expulsion est aujourd'hui décidée au cas par cas, avec des protections pour certaines situations familiales."),
    ("q71", "immigration", 1, "La France doit dénoncer l'accord franco-algérien de 1968 sur l'immigration.", "Cet accord fixe des règles d'entrée et de séjour spécifiques pour les ressortissants algériens."),
    ("q72", "securite", 1, "Les mineurs doivent pouvoir être jugés en comparution immédiate.", "La justice des mineurs prévoit aujourd'hui des procédures spécifiques."),
    ("q73", "securite", -1, "Il faut rétablir une police de proximité, centrée sur la prévention et le lien avec les habitants.", "Une police de proximité avait été créée en 1998, puis abandonnée au début des années 2000."),
    ("q74", "securite", 1, "Les polices municipales doivent être renforcées et armées, voire rendues obligatoires dans les grandes communes.", "La création et l'armement d'une police municipale relèvent aujourd'hui du choix du maire."),
    ("q75", "societe", 1, "Le téléphone portable doit être interdit dans tous les établissements scolaires, jusqu'au lycée.", "Il est interdit à l'école et au collège depuis 2018 ; la règle varie au lycée."),
    ("q76", "societe", -1, "La corrida et la chasse à courre doivent être interdites.", "Elles restent autorisées, la corrida dans les régions de tradition."),
    ("q77", "societe", -1, "Le droit à l'IVG doit être encore renforcé, y compris au niveau européen.", "La liberté de recourir à l'IVG est inscrite dans la Constitution depuis 2024."),
    ("q78", "institutions", -1, "Des citoyens tirés au sort doivent participer à la décision publique.", "Des conventions citoyennes tirées au sort ont déjà été réunies, à titre consultatif."),
    ("q79", "institutions", -1, "Le vote blanc doit être reconnu comme suffrage exprimé, voire le vote rendu obligatoire.", "Les votes blancs sont comptés mais n'entrent pas dans le calcul des résultats."),
    ("q80", "institutions", -1, "Les étrangers non européens résidant en France doivent pouvoir voter aux élections locales.", "Seuls les citoyens de l'Union européenne peuvent aujourd'hui voter aux élections municipales."),
    ("q81", "eco", -1, "L'État doit planifier les grands investissements et orienter l'économie.", "La planification fixe des objectifs pluriannuels (énergie, industrie, infrastructures) et les moyens publics pour les atteindre."),
    ("q82", "eco", 1, "Il faut supprimer massivement des normes et interdire d'aller au-delà des règles européennes.", "La « surtransposition » consiste à ajouter des exigences françaises aux règles européennes."),
    ("q83", "eco", -1, "Le prélèvement forfaitaire sur les revenus du capital (« flat tax ») doit être supprimé.", "Depuis 2018, dividendes et plus-values sont taxés à un taux unique d'environ 30 %, prélèvements sociaux compris."),
    ("q84", "social", -1, "Il faut relever fortement les petites retraites et le minimum vieillesse.", "Le minimum vieillesse (ASPA) est inférieur au seuil de pauvreté."),
    ("q85", "social", -1, "Les soins doivent être remboursés intégralement par la Sécurité sociale.", "Une partie des soins reste à la charge des patients ou de leur complémentaire santé."),
    ("q86", "social", -1, "Les allocations familiales doivent être versées dès le premier enfant.", "Elles ne sont aujourd'hui versées qu'à partir du deuxième enfant."),
    ("q87", "ecologie", -1, "La France doit accélérer sa sortie du pétrole et du gaz, avec un calendrier contraignant.", "Les énergies fossiles représentent encore environ 60 % de l'énergie consommée en France."),
    ("q88", "ecologie", -1, "Les plus gros pollueurs individuels (patrimoines élevés, jets privés) doivent être davantage taxés.", "Les émissions de gaz à effet de serre augmentent fortement avec le niveau de revenu et de patrimoine."),
    ("q89", "ecologie", -1, "Il faut taxer aux frontières de l'Europe les importations selon leur empreinte carbone.", "Un mécanisme européen d'ajustement carbone aux frontières se met en place pour certains produits."),
    ("q90", "europe", 1, "La France doit sortir du marché européen de l'électricité.", "Les prix de gros de l'électricité sont fixés dans un marché européen interconnecté."),
    ("q91", "europe", -1, "L'Union européenne doit emprunter en commun pour financer sa défense et son industrie.", "Un emprunt commun a déjà été lancé en 2020 pour le plan de relance européen."),
    ("q92", "immigration", 1, "Le séjour irrégulier doit redevenir un délit.", "Le délit de séjour irrégulier a été supprimé en 2012 ; le séjour irrégulier relève aujourd'hui de mesures administratives."),
    ("q93", "immigration", -1, "La France doit ouvrir davantage de voies légales d'immigration de travail.", "Les titres de séjour pour motif professionnel sont délivrés notamment pour les métiers en tension."),
    ("q94", "immigration", 1, "L'accès à la nationalité française doit être rendu plus difficile.", "La naturalisation exige notamment plusieurs années de résidence, un niveau de français et une adhésion aux valeurs républicaines."),
    ("q95", "securite", 1, "Les policiers doivent bénéficier d'une présomption de légitime défense.", "Aujourd'hui, l'usage de l'arme par un policier est examiné au cas par cas par la justice."),
    ("q96", "securite", -1, "Le contrôle de la police doit être confié à une autorité indépendante du ministère de l'Intérieur.", "Les enquêtes internes sont aujourd'hui menées par l'IGPN, rattachée à la police nationale."),
    ("q97", "securite", 1, "Il faut créer des prisons de très haute sécurité, isolées, pour les chefs du narcotrafic.", "Des quartiers de haute sécurité existent déjà dans certains établissements pénitentiaires."),
    ("q98", "societe", -1, "Le financement public de l'enseignement privé sous contrat doit être réduit.", "L'État rémunère les enseignants des écoles privées sous contrat, qui scolarisent environ 17 % des élèves."),
    ("q99", "societe", 1, "Le port du voile doit être interdit dans tout l'espace public.", "Le voile est interdit à l'école publique et pour les agents publics, pas dans la rue."),
    ("q100", "institutions", -1, "Il faut changer de Constitution (VIe République, assemblée constituante).", "La Constitution de la Ve République date de 1958."),
    ("q101", "institutions", -1, "Les citoyens doivent pouvoir révoquer un élu en cours de mandat.", "Un élu ne peut aujourd'hui être démis qu'en cas de condamnation ou de procédure exceptionnelle."),
    ("q102", "institutions", -1, "Le droit de vote doit être abaissé à 16 ans.", "On vote aujourd'hui à partir de 18 ans."),
    ("q103", "institutions", -1, "Le Sénat doit être supprimé ou profondément transformé.", "Le Sénat, élu au suffrage indirect, partage le pouvoir législatif avec l'Assemblée nationale."),
    ("q104", "defense", 1, "La France doit augmenter fortement ses dépenses militaires.", "Le budget des armées est en hausse ; les alliés de l'OTAN se sont engagés à porter leur effort de défense bien au-delà de 2 % du PIB."),
    ("q105", "defense", -1, "La France doit retirer ses troupes et ses bases militaires stationnées à l'étranger.", "La France maintient des forces prépositionnées dans plusieurs pays, notamment en Afrique et au Moyen-Orient."),
    ("q106", "defense", -1, "Les sanctions contre la Russie doivent être levées.", "L'Union européenne applique des sanctions contre la Russie depuis l'invasion de l'Ukraine en 2022."),
    ("q107", None, 1, "L'Union européenne doit suspendre son accord d'association avec Israël.", "Cet accord encadre les relations commerciales et politiques entre l'UE et Israël depuis 2000."),
    ("q108", None, 1, "Les exportations d'armes françaises doivent être restreintes et contrôlées par le Parlement.", "La France est l'un des premiers exportateurs d'armes au monde ; les autorisations relèvent aujourd'hui du gouvernement."),
    ("q109", "europe", -1, "L'Union européenne doit continuer à s'élargir (Ukraine, Moldavie, Balkans).", "Plusieurs pays sont officiellement candidats à l'adhésion, dont l'Ukraine et la Moldavie depuis 2022."),
    ("q110", "europe", 1, "La directive européenne sur les travailleurs détachés doit être abrogée ou cesser de s'appliquer en France.", "Elle permet à une entreprise d'un autre pays de l'UE d'envoyer temporairement ses salariés en France, avec des cotisations payées dans le pays d'origine."),
    ("q111", "europe", 1, "La politique agricole commune (PAC) doit être remplacée par une politique agricole nationale.", "La PAC est le premier poste du budget européen ; les agriculteurs français en sont les principaux bénéficiaires."),
    ("q112", "defense", 1, "Les pays européens doivent acheter en priorité des armements produits en Europe.", "Une part importante des équipements militaires achetés en Europe vient des États-Unis."),
    ("q113", "defense", 1, "L'Europe doit construire sa propre défense, sans dépendre des États-Unis.", "La sécurité de l'Europe repose largement sur l'OTAN, dont les États-Unis sont le premier contributeur."),
    ("q114", None, 1, "La réserve militaire doit être fortement augmentée, par exemple sous la forme d'une garde nationale.", "La France compte quelques dizaines de milliers de réservistes opérationnels."),
    ("q115", "societe", -1, "Le cannabis doit être légalisé et sa vente encadrée par l'État.", "L'usage de cannabis est un délit en France ; plusieurs pays l'ont légalisé."),
    ("q116", "societe", -1, "Le changement de genre (état civil, parcours médical) doit être facilité.", "Le changement de la mention du sexe à l'état civil passe aujourd'hui par un tribunal."),
    ("q117", "societe", 1, "Il faut interdire les organisations islamistes comme les Frères musulmans et fermer les mosquées radicales.", "Une loi de 2021 contre le séparatisme permet déjà de dissoudre des associations et de fermer des lieux de culte."),
    ("q118", "societe", -1, "Les spectacles avec animaux sauvages (cirques, delphinariums) doivent être interdits.", "Une loi de 2021 prévoit leur interdiction progressive, avec des délais de plusieurs années."),
    ("q119", "societe", 1, "L'école doit transmettre en priorité l'histoire de France et un récit national commun.", "Les programmes d'histoire combinent histoire de France, de l'Europe et du monde."),
    ("q120", "societe", 1, "L'écriture inclusive doit être interdite dans les documents officiels et à l'école.", "Une circulaire de 2021 la proscrit déjà dans l'enseignement, sans valeur législative."),
    ("q121", "societe", -1, "La prostitution doit être légalisée et encadrée.", "Depuis 2016, l'achat d'actes sexuels est sanctionné en France, pas leur vente."),
    ("q122", "societe", -1, "Le Concordat d'Alsace-Moselle, qui finance certains cultes sur fonds publics, doit être abrogé.", "En Alsace et en Moselle, la loi de 1905 ne s'applique pas : l'État rémunère les ministres de quatre cultes."),
    ("q123", "societe", 1, "Les parents qui accompagnent les sorties scolaires doivent être soumis à la neutralité religieuse.", "La loi de 2004 interdit les signes religieux ostensibles aux élèves, pas aux parents accompagnateurs."),
    ("q124", "societe", 1, "L'ouverture d'un lieu de culte doit être conditionnée à un engagement écrit de respect des principes républicains.", "La loi de 2021 contre le séparatisme a renforcé le contrôle des associations cultuelles."),
    ("q125", None, 1, "L'État doit baisser les taxes sur les carburants (TVA, certificats d'économies d'énergie) plutôt que verser des aides ciblées.", "Les prix des carburants ont fortement augmenté à l'automne 2026 ; le gouvernement privilégie des aides temporaires et ciblées."),
    ("q126", None, 1, "La France doit cesser son aide financière à l'Ukraine, tout en continuant à former et à équiper son armée.", "En septembre 2026, Marine Le Pen a proposé cette orientation ; plusieurs candidats et le gouvernement ont réagi."),
    ("q127", None, 1, "Les parents de mineurs auteurs de dégradations ou de délits doivent en répondre financièrement.", "Après les violences et dégradations lors des blocages de lycées à l'automne 2026, le garde des Sceaux a demandé aux procureurs d'engager la responsabilité civile des parents."),
    ("q128", None, -1, "Il faut augmenter fortement le salaire des enseignants.", "Le mouvement de blocage des lycées de l'automne 2026 a notamment dénoncé un manque de professeurs et de moyens."),
    ("q129", "europe", 1, "La France doit quitter l'Union européenne.", "La sortie suivrait la procédure de l'article 50 du traité sur l'Union européenne. Elle est distincte de la sortie de l'euro."),
    ("q130", "securite", 1, "La peine de mort doit être rétablie pour les crimes les plus graves.", "Abolie en 1981, elle est interdite par l'article 66-1 de la Constitution depuis 2007 : la rétablir supposerait de réviser la Constitution et de quitter des engagements internationaux."),
    ("q131", "securite", 1, "La perpétuité réelle, sans aucune possibilité de libération anticipée, doit être appliquée aux crimes les plus graves.", "Aujourd'hui, une peine de perpétuité peut être aménagée après une période de sûreté (en général 18 ans, portée à 22 ou 30 ans dans certains cas) ; la perpétuité incompressible n'est prévue que pour des cas très limités."),
    ("q132", "immigration", 1, "Les étrangers en situation régulière restés durablement au chômage doivent pouvoir être expulsés.", "Aujourd'hui, la perte d'emploi ne suffit pas, à elle seule, à justifier l'expulsion d'un étranger en situation régulière."),
    ("q133", "institutions", -1, "La Corse doit obtenir un statut particulier inscrit dans la Constitution.", "Un projet de révision constitutionnelle reconnaissant l'autonomie de la Corse est en discussion ; la Corse a aujourd'hui un statut de collectivité à statut particulier fixé par la loi."),
    ("q134", "ecologie", 1, "La France doit sortir progressivement du nucléaire.", "Le nucléaire fournit près des deux tiers de l'électricité produite en France."),
    ("q135", "social", 1, "La tarification à l'acte à l'hôpital doit être supprimée.", "Aujourd'hui, une grande partie du financement des hôpitaux dépend du nombre d'actes réalisés (tarification à l'activité, ou T2A)."),
    ("q136", "societe", 1, "Des groupes de niveau doivent être mis en place au collège.", "Les élèves seraient répartis selon leur niveau dans certaines matières. Introduits en 2024 dans le cadre du « choc des savoirs », ces groupes ont ensuite été revus."),
    ("q137", "institutions", -1, "Le ministre de la Justice doit pouvoir donner des instructions individuelles aux procureurs.", "Depuis 2013, la loi interdit au garde des Sceaux d'adresser des instructions dans des affaires individuelles ; il peut seulement fixer des orientations générales de politique pénale."),
    ("q138", "social", 1, "Les maisons de retraite (EHPAD) privées à but lucratif doivent être supprimées ou reprises par le secteur public ou associatif.", "Les EHPAD sont gérés par le secteur public, le secteur associatif ou le secteur privé commercial, qui en gère environ un quart des places."),
]
for i, a, s, e, c in new:
    Q.setdefault(i, {"id": i, "axe": a, "sens": s, "enonce": e, "contexte": c})

# Version 1.1 : 9 axes. Défense séparée de l'Union européenne ; certaines questions passent hors graphe
# (posées et comptées dans la proximité, mais sans effet sur le graphe).
AXE_V11 = {"q08": "defense", "q23": "defense", "q24": "defense", "q67": "defense"}
HORS = {"q05": "Énergie", "q63": "Énergie", "q53": "Territoires et pouvoirs", "q54": "Territoires et pouvoirs",
        "q55": "Territoires et pouvoirs", "q56": "Enfance et numérique", "q75": "Enfance et numérique",
        "q107": "International", "q108": "International", "q114": "Défense nationale",
        "q14": "Laïcité", "q99": "Laïcité", "q117": "Laïcité", "q98": "Laïcité",
        "q122": "Laïcité", "q123": "Laïcité", "q124": "Laïcité",
        "q133": "Territoires et pouvoirs", "q134": "Énergie", "q135": "Santé", "q136": "École", "q137": "Justice", "q138": "Santé",
        "q125": "Actualité", "q126": "Actualité", "q127": "Actualité", "q128": "Actualité"}

# Questions d'actualité : liées à un événement récent qui a fait réagir plusieurs candidats.
# Elles sont retirées automatiquement après `jusqu_au` (les positions restent dans positions.json).
ACTU = {
    "q125": {"depuis": "2026-09-16", "jusqu_au": "2026-12-31", "evenement": "Flambée des prix des carburants et divergences entre candidats sur les taxes et les aides.",
             "source": {"titre": "Sud Radio, « Que proposent les candidats pour lutter contre la flambée des prix du carburant ? »", "url": "https://www.sudradio.fr/politique/presidentielle-2027-que-proposent-les-candidats-pour-lutter-contre-la-flambee-des-prix-du-carburant"}},
    "q126": {"depuis": "2026-09-17", "jusqu_au": "2026-12-31", "evenement": "Marine Le Pen propose de mettre fin à l'aide financière à l'Ukraine ; réactions de plusieurs candidats.",
             "source": {"titre": "DH (dépêche AFP), « Le RN hausse le ton face à la Russie mais est accusé de double discours »", "url": "https://www.dhnet.be/dernieres-depeches/2026/09/19/le-rn-hausse-le-ton-face-a-la-russie-mais-est-accuse-de-double-discours-D5MBKUCBQVAQLCMK5OZQKS2IIQ/"}},
    "q127": {"depuis": "2026-10-02", "jusqu_au": "2026-12-15", "evenement": "Blocages de lycées : le garde des Sceaux demande aux procureurs de faire payer les réparations aux parents.",
             "source": {"titre": "Public Sénat, « Les parents doivent prendre leur responsabilité »", "url": "https://www.publicsenat.fr/actualites/politique/les-parents-doivent-prendre-leur-responsabilite-darmanin-souhaite-que-les-parents-payent-pour-les-degradations-des-lycees"}},
    "q128": {"depuis": "2026-10-02", "jusqu_au": "2026-12-15", "evenement": "Mouvement lycéen : manque de professeurs et de moyens dénoncé.",
             "source": {"titre": "Public Sénat, « Les parents doivent prendre leur responsabilité »", "url": "https://www.publicsenat.fr/actualites/politique/les-parents-doivent-prendre-leur-responsabilite-darmanin-souhaite-que-les-parents-payent-pour-les-degradations-des-lycees"}},
}
for qid, meta in ACTU.items():
    Q[qid]["actualite"] = meta
# Sujets très clivants : posés même si peu de candidats se sont prononcés (l'application ne les relègue pas en fin de thème).
CLIVANT = {"q13", "q30", "q71", "q77", "q80", "q94", "q99", "q107", "q115", "q116", "q117", "q121",
           "q129", "q130", "q131", "q132", "q133", "q134", "q136", "q137", "q138"}
for qid in CLIVANT:
    Q[qid]["clivant"] = True
# Questions qui demandent un changement : pour elles, le silence d'un programme complet vaut « ne le propose pas » (voir tools/gen.py, SILENCE).
# Nature des sujets : « etabli » = déjà en place (loi, traité, pratique) ; « actuel » = sujet récent ou en débat, pas encore en place.
#  - établi : un candidat dont le programme complet n'en parle pas valide le statu quo (voir tools/gen.py et tools/silence_propositions.json) ;
#    `statuquo` vaut -1 si l'affirmation demande un changement, +1 si elle défend l'existant.
#  - actuel : se taire n'exprime aucun avis (aucune position n'est déduite).
ACTUEL = {"q49", "q56", "q59", "q75", "q88", "q91", "q107", "q113", "q125", "q126", "q127", "q128", "q132", "q133", "q136"}
RULES = {r["question"]: r.get("score", -1) for r in json.load(open(root / "tools/silence_propositions.json", encoding="utf-8"))}
RULES["q129"] = -1
for qid in Q:
    Q[qid].pop("changement", None)
    Q[qid]["nature"] = "actuel" if qid in ACTUEL else "etabli"
    if qid in RULES:
        Q[qid]["statuquo"] = RULES[qid]
for qid, ax in AXE_V11.items():
    Q[qid]["axe"] = ax
for qid, th in HORS.items():
    Q[qid]["axe"] = None
    Q[qid]["theme"] = th

# Série 1 = une question par thème : le graphe devient lisible dès la fin de la série 1.
waves = [
    ["q01", "q03", "q05", "q07", "q09", "q11", "q14", "q16"],
    ["q02", "q04", "q06", "q08", "q10", "q12", "q13", "q15"],
    ["q17", "q19", "q21", "q23", "q25", "q27", "q29", "q31"],
    ["q18", "q20", "q22", "q24", "q26", "q28", "q30", "q32"],
    ["q33", "q36", "q39", "q44", "q45", "q48", "q51", "q53"],
    ["q34", "q37", "q40", "q43", "q46", "q49", "q56", "q54"],
    ["q35", "q38", "q41", "q42", "q47", "q50", "q52", "q55"],
    ["q57", "q60", "q63", "q66", "q69", "q72", "q75", "q78"],
    ["q58", "q61", "q64", "q67", "q70", "q73", "q76", "q79"],
    ["q59", "q62", "q65", "q68", "q71", "q74", "q77", "q80"],
    ["q81", "q84", "q87", "q90", "q92", "q95", "q98", "q100"],
    ["q82", "q85", "q88", "q91", "q93", "q96", "q99", "q101"],
    ["q83", "q86", "q89", "q94", "q97", "q102", "q103"],
    ["q104", "q105", "q106", "q107", "q108"],
    ["q109", "q110", "q111", "q112", "q113", "q114"],
    ["q115", "q116", "q117", "q118", "q119", "q120", "q121"],
    ["q122", "q123", "q124"],
    ["q125", "q126", "q127", "q128"],
    ["q129", "q130", "q131", "q132", "q133", "q134"],
    ["q135", "q136", "q137", "q138"],
]
out = []
for k, w in enumerate(waves, 1):
    for i in w:
        d = dict(Q[i]); d["serie"] = k; out.append(d)
json.dump(out, open(root / "data/questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "questions")
