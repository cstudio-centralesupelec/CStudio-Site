# CStudio - Site

Ce repo contient le site de CStudio.
Le site offre beaucoup de fonction différentes qui sont expliqués ici.

Ce projet utilise le framework vwebsite pour son backend, un framework custom que j'ai écrit qui permet de
faire des blogs riches et interactifs.
vwebsite est sous licence MIT.

Il utilise Vue pour son frontend

## Déployer le site

D'abord, vérifier que `Node JS` est installé ansi que `npm`.
Ensuite, cloner le repo: `git clone [lien du repo]`
Dans le repo, modifier le fichier `config.js` pour correspondre à la situation.
Puis, mettre les certificats `https` du site dans le dossier `cert` sous le nom `privkey.pem `et `cert.pem`.

Alors, vous pouvez installer les paquets requis pour faire marcher le site (principalement des trucs liés à sqlite) avec:

`npm i`

Après, il faut compiler le front du site avec:

`node compile_front.js`


Le site est alors prêt à être lancer. Vous pouvez le lancer avec:

`node server`

ou avec `pm2` :

`pm2 start server`

## Organisation du code

- `static`
Contient les pages HTML statiques visibles par l'utilisateur qui ne change pas ainsi que le CSS / JS, etc ...
Ces fichiers sont générés par le compilateur donc ne les modifiez pas.

- `frontend`
Contient les pages HTML/JS/CSS et autre avant la compilation, c'est les fichiers de ce dossier qu'il faut modifier
pour changer le frontend.
Actuellement, on utilise un preprocesseur custom car j'ai la flemme d'installer 10000 paquets pour faire marcher React.
Avec, on peut facilement ajouter des fonctionnalités de compilations cool comme:

- Traduction automatique 
- Auto compression des fichiers
- Detection des erreurs de syntax
- etc ...

Concernant le code du front end, on utilise **Vue** comme framework pour avoir accès à des composants réutilisables.



- `server`
Contient le code de la backend du site écrite en Node JS. Chaque fichier correspond en général soit à une classe,
soit à un endpoint de l'API.

## Documentation

En mode debug, le serveur génére une documentation plus détaillée des endpoints du site accessible à la page `/doc/`.
