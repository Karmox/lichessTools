(()=>{
  class PgnEditorTool extends LiChessTools.Tools.ToolBase {

    dependencies=[ 'ChessOps' ]

    preferences=[
      {
        name:'pgnEditor',
        category: 'analysis',
        type:'single',
        possibleValues: [false,true],
        defaultValue: true,
        advanced: true
      }
    ];

    intl={
      'en-US':{
        'options.analysis': 'Analysis',
        'options.pgnEditor': 'PGN Editor',
        'illegalMove': 'Illegal move in game %1, ply %3 (%2)',
        'pgnEditorText': 'PGN Editor',
        'pgnEditorTitle': 'LiChess Tools - PGN Editor',
        'btnMergeText': 'Merge PGNs',
        'btnMergeTitle': 'Merge PGNs (where possible)',
        'btnNormalizeText': 'Normalize PGNs',
        'btnNormalizeTitle': 'Group moves from the same board position',
        'btnSplitText': 'Split PGNs',
        'btnSplitTitle': 'Split into multiple one path PGNs',
        'btnCountText': 'Count PGNs',
        'btnCountTitle': 'Count number of PGNs',
        'btnCancelText': 'Cancel',
        'btnCancelTitle': 'Cancel currently running operation',
        'gameCount': '%s PGNs, %2 moves',
        'gameCount:one': 'one PGN, %2 moves',
        'mergingGames': 'Merging %s PGNs',
        'mergingGames:one': 'one PGN',
        'preparingGames': 'Preparing %s PGNs',
        'preparingGames:one': 'one PGN',
        'cannotMerge': 'Cannot merge!\r\n(no common board positions)',
        'mergeError': 'Error merging!\r\n(invalid input)',
        'operationCancelled': 'Operation cancelled'
      },
      'ro-RO':{
        'options.analysis': 'Analiz\u0103',
        'options.pgnEditor': 'Editor PGN',
        'illegalMove': 'Illegal move in game %1, ply %3 (%2)',
        'pgnEditorText': '',
        'pgnEditorTitle': '',
        'btnMergeText': '',
        'btnMergeTitle': '',
        'btnNormalizeText': '',
        'btnNormalizeTitle': '',
        'btnSplitText': '',
        'btnSplitTitle': '',
        'btnCountText': '',
        'btnCountTitle': '',
        'gameCount': '',
        'gameCount:one': '',
        'mergingGames': '',
        'mergingGames:one': ''
      }
    }

    showPgnEditor=()=>{
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;
      $('dialog.lichessTools-pgnEditor').remove();
      const dialog=$('<dialog class="lichessTools-pgnEditor">')
        .append(`
    <div class="close-button-anchor">
        <button class="close-button" data-icon="&#xE03F;" aria-label="Close"/>
    </div>
    <div class="scrollable">
        <div class="dialog-content">
            <h2></h2>
            <div class="input-wrapper">
              <textarea autofocus></textarea>
              <div class="buttons">
                <button class="button" type="button" data-role="merge"></button>
                <button class="button" type="button" data-role="normalize"></button>
                <button class="button" type="button" data-role="split"></button>
                <button class="button" type="button" data-role="count"></button>
                <button class="button" type="button" data-role="cancel"></button>
                <label></label>
              </div>
            </div>
        </div>
    </div>
`)
        .appendTo('body');
      $('div.dialog-content>h2').text(trans.noarg('pgnEditorText'));
      const textarea=$('textarea',dialog);
      $('[data-role="merge"]',dialog)
        .text(trans.noarg('btnMergeText'))
        .attr('title',trans.noarg('btnMergeTitle'))
        .on('click',ev=>{
          ev.preventDefault();
          this.runOperation('merge',()=>this.mergePgn(textarea));
        });
      $('[data-role="normalize"]',dialog)
        .text(trans.noarg('btnNormalizeText'))
        .attr('title',trans.noarg('btnNormalizeTitle'))
        .on('click',ev=>{
          ev.preventDefault();
          this.runOperation('normalize',()=>this.normalizePgn(textarea));
        });
      $('[data-role="split"]',dialog)
        .text(trans.noarg('btnSplitText'))
        .attr('title',trans.noarg('btnSplitTitle'))
        .on('click',ev=>{
          ev.preventDefault();
          this.runOperation('split',()=>this.splitPgn(textarea));
        });
      $('[data-role="count"]',dialog)
        .text(trans.noarg('btnCountText'))
        .attr('title',trans.noarg('btnCountTitle'))
        .on('click',ev=>{
          ev.preventDefault();
          this.runOperation('count',()=>this.countPgn(textarea));
        });
      $('[data-role="cancel"]',dialog)
        .text(trans.noarg('btnCancelText'))
        .attr('title',trans.noarg('btnCancelTitle'))
        .on('click',ev=>{
          ev.preventDefault();
          this.stopOperations();
        });
      $('button.close-button',dialog)
        .on('click',ev=>{
          ev.preventDefault();
          this.stopOperations();
          dialog.remove();
        });
      this._label=$('dialog.lichessTools-pgnEditor .buttons label');
      this.toggleCancel(false);
    };

    stopOperations=()=>{
      if (!this._runningOperation) return;
      this._cancelRequested=true;
    }

    runOperation=async (name,operation)=>{
      const parent=this.lichessTools;
      const trans=parent.translator;
      if (this._runningOperation) return;
      const now=Date.now();
      try {
        
        this._cancelRequested=false;
        this._runningOperation=name;
        this.toggleCancel(true);
        await parent.timeout(0);
        await operation();
      } finally {
        if (this._cancelRequested) {
          this._cancelRequested=false;
          this.writeNote(trans.noarg('operationCancelled'));
        }
        this._runningOperation=null;
        this.toggleCancel(false);
        parent.global.console.debug('Operation '+name+' took '+Math.round((Date.now()-now)/100)/10+' seconds');
      }
    };

    toggleCancel=(value)=>{
      const parent=this.lichessTools;
      const $=parent.$;
      $('dialog.lichessTools-pgnEditor button:not([data-role="cancel"])')
        .toggleClass('disabled',!!value)
        .prop('disabled',!!value);
      $('dialog.lichessTools-pgnEditor button[data-role="cancel"]')
        .toggleClass('disabled',!value)
        .prop('disabled',!value);
    };

    writeNote=(text)=>{
      if (!this._label) return;
      this._label.text(text);
    };

    countPgn=async ()=>{
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;
      const text=$('dialog.lichessTools-pgnEditor textarea').val();
      const co=parent.chessops;
      const games=co.pgn.parsePgn(text).filter(g=>g.headers.get('FEN')||g.moves?.children?.length);

      let moveCount=0;
      const traverse=(node)=>{
        if (!node.children?.length) return;
        moveCount++;
        for (const child of node.children) {
          traverse(child);
        }
      };
      for (const game of games) {
        traverse(game.moves);
      }
      this.writeNote(trans.pluralSame('gameCount',games.length).replace(/%2/g,moveCount));
    };

    enhanceGameWithFens=game=>{
      const parent=this.lichessTools;

      const co=parent.chessops;
      const { startingPosition,parsePgn } = co.pgn;
      const { makeFen }= co.fen;
      const { parseSan, makeSanAndPlay } = co.san;

      const pos = startingPosition(game.headers).unwrap();

      const traverse=(pos,node,ply=0)=>{
        const fen=makeFen(pos.toSetup());
        node.data={...node.data,fen:fen};
        if (!node.children?.length) return;
        for (const child of node.children) {
          const newPos=pos.clone();
          const move = parseSan(newPos, child.data.san);
          if (!move) {
            const err=new Error('Move '+child?.data?.san+' at ply '+ply+' is illegal!');
            err.san=child?.data?.san;
            err.ply=ply+1;
            throw err;
          }
          const san = makeSanAndPlay(newPos, move);
          traverse(newPos,child,ply+1);
        }
      };
      
      const node=game.moves;
      traverse(pos,node);
    };

    enhanceGameWithFenDict=game=>{
      const parent=this.lichessTools;

      game.fenDict=new Map();

      const traverse=(node,ply=0)=>{
        const fen=node.data?.fen;
        if (!fen) throw new Error('Cannot find FEN for node '+node.data?.san+' at ply '+ply+'!');
        const key=parent.getFenPosition(fen);
        let arr=game.fenDict.get(key);
        if (!arr) {
          arr=[];
          game.fenDict.set(key,arr);
        }
        arr.push(node);
        if (!node.children?.length) return;
        for (const child of node.children) {
          traverse(child,ply+1);
        }
      };
      
      const node=game.moves;
      traverse(node);
    };

    mergePgn=async (textarea)=>{
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;

      const co=parent.chessops;
      const { startingPosition,parsePgn,makePgn } = co.pgn;
      const { makeFen }= co.fen;
      const { parseSan, makeSanAndPlay } = co.san;
      const text=textarea.val();
      const games=parsePgn(text);
      this.writeNote(trans.pluralSame('mergingGames',games.length));
      await parent.timeout(0);
      let withErrors=false;
      let gameIndex=0;
      this.writeNote(trans.pluralSame('preparingGames',games.length));
      await parent.timeout(0);
      for (const game of games) {
        gameIndex++;
        try {
          this.enhanceGameWithFens(game);
        } catch(ex) {
          if (ex.ply) {
            const data=[gameIndex, ex.san, ex.ply]
            parent.announce(trans.noarg('illegalMove').replace(/%(\d)/g,m=>{
              return data[+m[1]-1];
            }));
          } else throw ex;
          withErrors=true;
        }
      }
      if (withErrors) {
        this.writeNote(trans.noarg('mergeError'));
        return;
      }

      const mergeNodes=(n1,n2)=>{
        n1.children=[...n1.children,...n2.children];
        const comments=(n1.data?.comments||[]).concat((n1.data?.comments||[]));
        if (comments.length) {
          n1.data.comments=[...new Set(comments)];
        }
        const nags=(n1.data?.nags||[]).concat((n1.data?.nags||[]));
        if (nags.length) {
          n1.data.nags=[...new Set(nags)];
        }
      };

      const mergeGames=(dest,node,src)=>{
        node.children=[...node.children,...src.moves.children];
        if (dest.fenDict || src.fenDict) {
          if (!dest.fenDict || !src.fenDict) throw new Error('Cannot merge games that have different enhancement (fenDict)');
          for (const pair of src.fenDict) {
            const newArr=(dest.fenDict.get(pair[0])||[]).concat(pair[1]);
            dest.fenDict.set(pair[0],newArr);
          }
        }
      };

      const cleanGame=(game)=>{

        const traverse=(game,node)=>{
          if (!node.children?.length) return;
          for (let i=0; i<node.children.length; i++) {
            for (let j=i+1; j<node.children.length; j++) {
               const childI=node.children[i];
               const childJ=node.children[j];
               if (childI.data.san==childJ.data.san) {
                 mergeNodes(childI,childJ);
                 const key=parent.getFenPosition(childJ.data.fen);
                 parent.arrayRemoveAll(game.fenDict[key],n=>n==childJ);
                 parent.arrayRemoveAll(node.children,n=>n==childJ);
               }
            };
          };
          for (const child of node.children) {
            traverse(game, child);
          }
        };

        traverse(game,game.moves);
      };


      const initialNumberOfGames=games.length;
      let i=games.length-1;
      let lastWrite=Date.now();
      while(i>0 && !this._cancelRequested) {
        if (Date.now()-lastWrite>1000) { 
          this.writeNote(trans.pluralSame('mergingGames',games.length));
          lastWrite=Date.now();
          await parent.timeout(0);
        }
        const gameI=games[i];
        const fenI = gameI.moves.data.fen;
        for (let j=i-1; j>=0; j--) {
          const gameJ=games[j];
          const fenJ = gameJ.moves.data.fen;
          if (fenI==fenJ) {
            mergeGames(gameJ,gameJ.moves,gameI);
            parent.arrayRemoveAll(games,g=>g==gameI);
            break;
          }
        }
        i--;
      }
      if (i>0) {
        this.enhanceGameWithFenDict(game);        
      }
      while(i>0 && !this._cancelRequested) {
        if (Date.now()-lastWrite>1000) { 
          this.writeNote(trans.pluralSame('mergingGames',games.length));
          lastWrite=Date.now();
          await parent.timeout(0);
        }
        let merged=false;
        const gameI=games[i];
        const keyI=parent.getFenPosition(gameI.moves.data.fen);
        for (let j=i-1; j>=0; j--) {
          const gameJ=games[j];
          const nodes=gameJ.fenDict.get(keyI);
          if (nodes) {
            mergeGames(gameJ,nodes[0],gameI);
            parent.arrayRemoveAll(games,g=>g==gameI);
            merged=true;
            break;
          }
        }
        if (!merged) {
          for (let j=i-1; j>=0; j--) {
            const gameJ=games[j];
            const keyJ=parent.getFenPosition(gameJ.moves.data.fen);
            const nodes=gameI.fenDict.get(keyJ);
            if (nodes) {
              mergeGames(gameI,nodes[0],gameJ);
              parent.arrayRemoveAll(games,g=>g==gameJ);
              merged=true;
              break;
            }
          }
        }
        i--;
      }
      if (this._cancelRequested) {
        return;
      }

      this.writeNote(trans.pluralSame('preparingGames',games.length));
      await parent.timeout(0);
      for (const game of games) {
        if (!game.fenDict) {
          this.enhanceGameWithFenDict(game);        
        }
        cleanGame(game);
      }

      const newText=games.map(g=>makePgn(g)).join('\r\n\r\n')
        .replace(/\[[^\s]+\s+"[\?\.\*]*"\]\s*/g,'');
      textarea.val(newText);
      if (games.length<initialNumberOfGames) {
        this.countPgn();
      } else {
        this.writeNote(trans.noarg('cannotMerge'));
      }
    };

    normalizePgn=async (textarea)=>{
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;
    };

    splitPgn=async (textarea)=>{
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;
    };

    async start() {
      const parent=this.lichessTools;
      const value=parent.currentOptions.getValue('pgnEditor');
      this.logOption('PGN editor', value);
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;
      const container=$('#topnav section a[href="/analysis"]+div[role="group"]');
      $('a.lichessTools-pgnEditor',container).remove();
      if (!value) return;
      $('<a/>')
        .addClass('lichessTools-pgnEditor')
        .text(trans.noarg('pgnEditorText'))
        .attr('title',trans.noarg('pgnEditorTitle'))
        .on('click',ev=>{
          ev.preventDefault();
          this.showPgnEditor();
          $('nav#topnav').trigger('mouseout');
        })
        .appendTo(container);
    }

  }
  LiChessTools.Tools.PgnEditor=PgnEditorTool;
})();
