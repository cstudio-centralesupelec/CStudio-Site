# CStudio - Site

Ce repo contient le site de CStudio.
Le site offre beaucoup de fonction différentes qui sont expliqués ici.

Ce projet utilise le framework vwebsite pour son backend, un framework custom que j'ai écrit qui permet de
faire des blogs riches et interactifs.
vwebsite est sous licence MIT.

Il utilise Vue pour son frontend

## Tester / Lancer le site

Pour lancer le site, il suffit de faire `node server.js`
On peut changer la configuration du site avec le fichier `config.js`
Les certificats https du site se trouvent dans le dossier `cert` sous le nom 

## Organisation du code

- `static`
Contient les pages HTML statiques visibles par l'utilisateur qui ne change pas ainsi que le CSS / JS, etc ...
Si un jour, vous voulez réécrire le front en react, il faudra mettre les fichiers compilés ici.

Pour l'instant, on utilise **Vue** pour avoir accès à des composants réutilisables.
En théorie, je serais chaud pour écrire un préprocesseur custom, qui permettrait d'avoir accès à plein de features cools comme:
- Multi-langage
- Templates plus intelligents
- Site plus rapide
Mais là, flemme


- `server`
Contient le code de la backend du site écrite en NodeJS. Chaque fichier correspond en général soit à une classe,
soit à un endpoint de l'API.

- `doc`
Contient une documentation plus détaillée des endpoints du site qui est générée automatiquement.
En mode DEBUG (activable depuis la configuration), il est possible d'aller à la page `/doc/`
pour tester l'API si besoin.