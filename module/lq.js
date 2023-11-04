/////////////////////////////////////////////////////////////////

function ß(source, execute) {
	const execChain = [];

    const sortPredicate = (predicate, a, b) => {
        return predicate(a) < predicate(b)
            ? -1
            : predicate(b) < predicate(a)
                ? 1
                : 0;
    };

    const addSort = (obj, sort, subSort) => {
        if(subSort) {
            subSort(obj);
        }

        execChain.push(() => {
            sort(obj.value);
        });
    };

    const addJoin = (obj, joinType, rSource, lKey, rKey, transform) => {
        execChain.push(() => {
            const isRight = (joinType == "rjoin");
            const isInner = (joinType == "join");

            let pkSource = (isRight) ? rSource : obj.value;
            const pKey = (isRight) ? rKey : lKey; 
            
            const fkSource = (isRight) ? obj.value : rSource;
            const fKey = (isRight) ? lKey : rKey; 

            const fkMap = new Map();

            for(const item of fkSource) {
                const key = fKey(item);

                if(fkMap.has(key)) {
                    fkMap.get(key).push(item);
                }
                else {
                    fkMap.set(key, [item]);
                }
            }

            if(isInner) {
                pkSource = pkSource.filter((item) => fkMap.has(pKey(item)));
            }

            obj.value = pkSource
                .map((pkItem, i) => { return (fkMap.get(pKey(pkItem)) ?? [undefined])
                    .map((fkItem) => {
                        const itemL = (isRight) ? fkItem : pkItem;
                        const itemR = (isRight) ? pkItem : fkItem;

                        if(transform) {
                            return transform(itemL, itemR);
                        }

                        return [itemL, itemR];
                    });
                })
                .flat();
        });
    };

	if(execute) {
        for(const item of source) {
            execute(item);
        }
    }

	return {
      value: null,

      where: function(filter) {
      	execChain.push(() => {
            this.value = this.value.filter((v) => filter(v));
        });
        
        return this;
      },

      asc: function(predicate, subSort) {
        addSort(this, (o) => (predicate) ? o.sort((a, b) => sortPredicate(predicate, a, b)) : o.sort(), subSort);

        return this;
      },

      desc: function(predicate, subSort) {
        addSort(this, (o) => (predicate) ? o.sort((b, a) => sortPredicate(predicate, a, b)) : o.sort().reverse(), subSort);

        return this;
      },

      project: function(transform) {
        execChain.push(() => {
            this.value = this.value.map((v) => transform(v));
        });

        return this;
      },
      
      join: function(rSource, lKey, rKey, transform) {
        addJoin(this, "join", rSource, lKey, rKey, transform);

        return this;
      },

      ljoin: function(rSource, lKey, rKey, transform) {
        addJoin(this, "ljoin", rSource, lKey, rKey, transform);

        return this;
      },

      rjoin: function(rSource, lKey, rKey, transform) {
        addJoin(this, "rjoin", rSource, lKey, rKey, transform);

        return this;
      },

      cross: function(rSource, transform) {
        addJoin(this, "cross", rSource, (lItem) => 1, (rItem) => 1, transform);

        return this;
      },

      list: function(transform)  {
        if(transform) {
            this.project(transform);
        }

        this.value = [...source];

        for(const operation of execChain) {
            operation();
        }
        
        return this.value;
      }
   };
}



/////////////////////////////////////////////////////////////////



const source = [
    { k: "A", v: 3 },
    { k: "B", v: 4 },
    { k: "B", v: 1 },
    { k: "A", v: 5 },
    { k: "A", v: 2 },
    { k: "B", v: 2 },
    { k: "B", v: 5 },
    { k: "A", v: 4 },
    { k: "B", v: 3 },
    { k: "A", v: 1 }
];

const source2 = [
    { k: "A", v: "X" },
    { k: "A", v: "Y" },
    { k: "C", v: "X" },
    { k: "C", v: "Y" },
];

const query = ß(source)
    .where((v) => v.v != 3)
    .project((v) => v)
    .asc((v) => v.k, (b) =>
        b.desc((v) => v.v)
    );
//            .cross(source2, (a, b) => { return { lk: a?.k, lv: a?.v, rk: b?.k, rv: b?.v }; });

    // .join(source2,
    //     (a) => a.k,
    //     (b) => b.k,
    //     (a, b) => { return { lk: a?.k, lv: a?.v, rk: b?.k, rv: b?.v }; }
    // );

const list = query.list((item) => { return { k: item.k + "2", v: -item.v }; });

for(const v of list)
    console.log(v);





