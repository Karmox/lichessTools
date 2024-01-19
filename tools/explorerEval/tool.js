(()=>{
  class ExplorerEvalTool extends LiChessTools.Tools.ToolBase {

    dependencies=['EmitRedraw'];

    preferences=[
      {
        name:'explorerEval',
        category: 'analysis',
        type:'multiple',
        possibleValues: ['ceval','db','stats','hidden'],
        defaultValue: 'ceval,db',
        advanced: true
      }
    ];

    intl={
      'en-US':{
        'options.analysis': 'Analysis',
        'options.explorerEval': 'Show evaluation of explorer moves',
        'notAllowedByCSP': 'Lichess does not allow connection to chessdb',
        'explorerEval.ceval': 'From computer eval',
        'explorerEval.stats': 'From winning stats',
        'explorerEval.db': 'From cloud',
        'explorerEval.hidden': 'Hidden',
        'fromCevalTitle': 'LiChess Tools - from computer eval',
        'fromStatsTitle': 'LiChess Tools - from winning stats',
        'fromChessDbTitle': 'LiChess Tools - from ChessDb',
        'fromLichessTitle': 'LiChess Tools - from cloud, depth %s',
        'evaluationTitle': 'LiChess Tools - move evaluation',
        'evalWarning': 'LiChess Tools - pay attention'
       },
      'ro-RO':{
        'options.analysis': 'Analiz\u0103',
        'options.explorerEval': 'Arat\u0103 evaluarea mut\u0103rilor \u00een Explorator',
        'notAllowedByCSP': 'Lichess nu permite conexiunea la chessdb',
        'explorerEval.ceval': 'Din evaluare computer',
        'explorerEval.stats': 'Din statistici',
        'explorerEval.db': 'Din cloud',
        'explorerEval.hidden': 'Ascunde',
        'fromCevalTitle': 'LiChess Tools - din evaluare computer',
        'fromStatsTitle': 'LiChess Tools - din statistici',
        'fromChessDbTitle': 'LiChess Tools - de la ChessDb',
        'fromLichessTitle': 'LiChess Tools - din cloud, ad\u00e2ncime %s',
        'evaluationTitle': 'LiChess Tools - evaluare mutare',
        'evalWarning': 'LiChess Tools - aten\u0163ie'
      }
    }

    showEvaluations(result) {
      const moves=result?.moves;
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const trans=parent.translator;
      const analysis=lichess?.analysis;
      const orientation=analysis.getOrientation()=='black'?-1:1;
      const container=$('section.explorer-box table.moves');
      if (!container.length) return;
      if (parent.isGamePlaying()) return;
      if (!$('th.lichessTools-explorerEval',container).length) {
        $('<th>')
            .addClass('lichessTools-explorerEval')
            .text('\u2924')
            .attr('title',trans.noarg('evaluationTitle'))
            .insertAfter($('th:nth-child(1)',container));
      }
      $('tr[data-uci],tr.sum',container).each((i,e)=>{
        if (!$('td.lichessTools-explorerEval',e).length) {
          $('<td>')
            .addClass('lichessTools-explorerEval')
            .insertAfter($('td:nth-child(1)',e));
        }
        const uci=$(e).attr('data-uci');
        let move=moves?.find(m=>m.uci==uci);
        const explorerItem=(analysis.explorer.current()?.moves||[]).find(i=>i.uci==uci);
        if (!explorerItem) return;
        let text='';
        let rank=-1;
        let title=null;
        const total=explorerItem.white+explorerItem.draws+explorerItem.black;
        const wr=(explorerItem.white+explorerItem.draws/2)/total;
        let cp = -Math.log(1/wr-1)*330
        const isInfinite=!Number.isFinite(cp);
        if (isInfinite) {
          cp=Math.sign(cp)*10000;
        }
        if (move) {
          text=move.mate?('M'+move.mate):(Math.round(move.cp/10)/10);
          rank=move.rank;
          switch(rank) {
            case null: title=trans.noarg('fromCevalTitle'); break;
            case 0: 
            case 1: 
            case 2: 
            case 3: 
              title=trans.noarg('fromChessDbTitle'); 
            break;
            case 5: title=trans.pluralSame('fromLichessTitle',move.depth); break;
          }
          
          explorerItem.cp=move.cp;
          explorerItem.mate=move.mate;

          if (total>=100) {
            const moveCp=move.mate?Math.sign(move.mate)*(10000-Math.abs(move.mate)*100):move.cp;
            const sim=Math.round(Math.abs(moveCp-cp)/(Math.abs(moveCp)+Math.abs(cp))*100);
            if (sim>=20) {
              explorerItem.diff=Math.abs(moveCp-cp);
              explorerItem.signVal=orientation*(Math.abs(moveCp)>Math.abs(cp)
                ? moveCp
                : cp);
            }
          }
        } else if (this.options.stats) {
          if (!isInfinite&&total>=100) {
            title=trans.noarg('fromStatsTitle');
            text=Math.round(cp/10)/10;
          }
          explorerItem.cp=cp;
          explorerItem.mate=undefined;
        }
        
        $('td.lichessTools-explorerEval',e)
          .text(text)
          .attr('title',title)
          .toggleClass('lichessTools-stat',rank===-1)
          .toggleClass('lichessTools-bad',rank===0)
          .toggleClass('lichessTools-good',rank===1)
          .toggleClass('lichessTools-best',rank===2)
          .toggleClass('lichessTools-cloud',rank===5);
        $(e)
          .removeClass('lichessTools-warning-red')
          .removeClass('lichessTools-warning-green')
          .removeAttr('title');
        if (explorerItem.diff>200) {
          $(e)
            .addClass(explorerItem.signVal<0?'lichessTools-warning-red':'lichessTools-warning-green')
            .attr('title',trans.noarg('evalWarning'));
        }
      });
    }

    jsonWith404=async (url,options)=>{
      const parent=this.lichessTools;
      const key=parent.global.JSON.stringify(url);
      let result = this.cache[key];
      if (result !== undefined) return result;
      options=options||{};
      options.ignoreStatuses=[404];
      try {
        const json = await parent.net.fetch(url,options);
        result=parent.jsonParse(json);
        this.cache[key]=result;
      } catch(e) {
        parent.global.console.debug('Error fetching 404 JSON API',url,e);
      }
      return result;
    };

    cache404={};
    setCached404= (path)=>path?this._setCached404(path,this.cache404):false;
    getCached404= (path)=>path?this._getCached404(path,this.cache404):false;
    _setCached404= (path,node)=>{
      if (node===true) return;
      const key=path?.slice(0,2);
      if (key) {
        let newNode=node[key];
        if (!newNode) {
          if (path==key) {
            node[key]=true;
            return;
          }
          newNode={};
          node[key]=newNode;
        }
        this._setCached404(path?.slice(2),newNode);
      }
    };
    _getCached404= (path,node)=>{
      const key=path?.slice(0,2);
      if (!key) {
        return false;
      }
      const newNode=node[key];
      if (newNode===true) return true;
      if (!newNode) {
        return false;
      }
      return this._getCached404(path?.slice(2),newNode);
    };

    cache={};
    doEvaluation=async ()=>{
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const $=parent.$;
      const analysis=lichess?.analysis;
      if (!analysis.explorer?.enabled()) return;
      if (parent.isGamePlaying()) return;
      const explorerMoves = analysis.explorer?.current()?.moves;
      if (!explorerMoves?.length) return;
      if (!parent.inViewport($('section.explorer-box table.moves')[0])) return;
      const fen=analysis.node.fen;
      const whosMove=analysis.node.ply%2?-1:1;
      let result = this.cache[fen];
      if (this.getCached404(analysis.path)) {
        result={ moves:[] };
      }
      let newMoves=[];
      if (this.options.db && !parent.net.slowMode && result===undefined && (!this.options.ceval || !analysis.ceval.enabled())) {
        result={ moves: [] };
        if (this.CSP) {
          let obj=await this.jsonWith404({
            url:'/api/cloud-eval?fen={fen}&multiPv=5',
            args:{ fen: fen }
          });
          if (obj) {
            newMoves=obj.pvs?.map(m=>{
              return {
                depth: obj.depth,
                uci: m.moves?.split(' ')[0],
                cp: m.cp,
                mate: m.mate,
                rank: 5
              };
            });
            if (newMoves?.length && !parent.net.slowMode) {
              obj=await this.jsonWith404({
                url:'/api/cloud-eval?fen={fen}&multiPv=10',
                args:{ fen: fen }
              });
              if (obj) {
                obj.pvs?.forEach(m=>{
                  const uci=m.moves?.split(' ')[0];
                  if (newMoves.find(nm=>nm.uci==uci)) return;
                  newMoves.push({
                    depth: obj.depth,
                    uci: uci,
                    cp: m.cp,
                    mate: m.mate,
                    rank: 5
                  });
                });
              }
            }
          } else {
            this.setCached404(analysis.path);
          }
        } else {
          const obj=await this.jsonWith404({
            url:'https://www.chessdb.cn/cdb.php?action=queryall&board={fen}&json=1',
            args:{ fen: fen }
          });
          newMoves=obj.moves?.map(m=>{
            return {
              depth: 50, //assumed
              uci: m.uci,
              cp: m.winrate?whosMove*m.score:null,
              mate:m.winrate?null:whosMove*Math.sign(m.score)*(30000-Math.abs(m.score)),
              rank: m.rank
            };
          });
        }
        if (newMoves?.length) {
          newMoves.forEach(nm=>{
            const uci=nm.moves?.at(0);
            const existingMove=result.moves.find(m=>m.uci==uci);
            if (existingMove) {
              if (nm.depth>existingMove.depth) {
                existingMove.depth=nm.depth;
                existingMove.cp=nm.cp;
                existingMove.mate=nm.mate;
              }
            } else {
              result.moves.push(nm);
            }
          });
        }
      }
      result = result || { moves: [] };
      const ceval=analysis.ceval?.curEval || analysis.ceval?.lastStarted?.steps?.at(-1)?.ceval;
      const pvs=this.options.ceval
        ? ceval?.pvs
        : null;
      if (pvs?.length) {
        pvs.forEach(p=>{
          const uci=p.moves?.at(0);
          const existingMove=result.moves.find(m=>m.uci==uci);
          if (existingMove&&ceval.depth>existingMove.depth) {
            existingMove.depth=ceval.depth;
            existingMove.cp=p.cp;
            existingMove.mate=p.mate;
            existingMove.rank=null;
          } else {
            result.moves.push({
              depth: ceval.depth,
              uci: uci,
              cp: p.cp,
              mate: p.mate,
              rank: null
            });
          }
        });
      }
      if (result.moves?.length) {
        this.cache[fen]=result;
      }
      this.showEvaluations(result);
    };
    doEvaluationDebounced=this.lichessTools.debounce(this.doEvaluation,100);

    rebind=()=>{
      const parent=this.lichessTools;
      const value=parent.currentOptions.getValue('explorerEval');
      const lichess=parent.lichess;
      const $=parent.$;
      const analysis=lichess?.analysis;
      if (!analysis) return;
      const explorer = analysis.explorer;
      if (!value) {
        explorer.setNode=parent.unwrapFunction(explorer.setNode,'explorerEval');
      } else {
        if (!parent.isWrappedFunction(explorer.setNode,'explorerEval')) {
          explorer.setNode=parent.wrapFunction(explorer.setNode,{
            id: 'explorerEval',
            after: async ($this, result, ...args)=>{
              if (!explorer.lastStream) return;
              await explorer.lastStream.promise;
              this.doEvaluationDebounced();
            }
          });
        }
        this.doEvaluationDebounced();
      }
    };

    CSP=false; // default to true until lichess CSP rules allow chessdb.cn
    secCheck=e=>{
      if (this.CSP) return;
      if (!e.blockedURI?.includes('chessdb.cn')) {
        this.CSP=false;
        return;
      }
      this.CSP=true;
      const parent=this.lichessTools;
      const lichess=parent.lichess;
      const trans=parent.translator;
      const text=trans.noarg('notAllowedByCSP');
      lichess.announce({ msg: text });
      this.doEvaluationDebounced();
    };

    async start() {
      const parent=this.lichessTools;
      const value=parent.currentOptions.getValue('explorerEval');
      this.logOption('Explorer eval', value);
      this.options={
        ceval: parent.isOptionSet(value,'ceval'),
        stats: parent.isOptionSet(value,'stats'),
        db: parent.isOptionSet(value,'db'),
        hidden: parent.isOptionSet(value,'hidden'),
        get isSet() { return !this.hidden && (this.ceval || this.db || this.stats); }
      };
      const lichess=parent.lichess;
      const $=parent.$;
      const explorer=lichess?.analysis?.explorer;
      if (!explorer) return;
      lichess.pubsub.off('redraw',this.rebind);
      $(parent.global.document).off('securitypolicyviolation',this.secCheck)
      $('th.lichessTools-explorerEval,td.lichessTools-explorerEval').remove();
      explorer.setNode=parent.unwrapFunction(explorer.setNode,'explorerEval');
      if (!this.options.isSet) return;
      this.cache={};
      $(parent.global.document).on('securitypolicyviolation',this.secCheck);
      lichess.pubsub.on('redraw',this.rebind);
      this.rebind();
    }

  }
  LiChessTools.Tools.ExplorerEval=ExplorerEvalTool;
})();
