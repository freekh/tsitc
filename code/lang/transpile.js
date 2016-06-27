const parse = require('./parser/parse');
const transduce = require('./transduce');
const builtins = require('./combinators');

const lift = (node) => { // FIXME: feels very unefficient, but perhaps it is best?
  if (node.type === 'Expression') {
    if (node.arg && node.arg.type === 'Curry') {
      return true;
    }
    return lift(node.arg);
  } else if (node.type === 'Composition') {
    return node.combinators.reduce(false, (acc, curr) => {
      return acc || lift(curr);
    }) || lift(node.target);
  } else if (node.type === 'List') {
    return node.elements.reduce(false, (acc, curr) => {
      return acc || lift(curr);
    });
  } else if (node.type === 'Instance') {
    let lifted = false;
    node.elements.forEach(({ value }) => {
      lifted = lift(value);
    });
    return lifted;
  } else if (node.type === 'Text') {
    return false;
  } else if (node.type === 'Context') {
    return false;
  } else if (node.type === 'Eval') {
    return lift(node.expression);
  }
  throw new Error(`Cannot lift: ${JSON.stringify(node)}`);
};

const normalize = (id, aliases) => {
  const path = id.value;
  const alias = aliases[path];
  return alias || path;
};

const transpileFun = (node, aliases, request, partialFun) => {
  const fullPath = normalize(node.path, aliases);
  const builtin = builtins[fullPath];

  let fun = null;
  if (builtin) {
    fun = builtin;
  } else {
    fun = request(`${fullPath}.tasitc`);
  }

  return fun;
};

const transpile = (parseTree) => {
  const init = (node, aliases, request) => {
    const recurse = (node, partialFun) => {
      if (node.type === 'Expression') {
        const fun = transpileFun(node, aliases, request, partialFun);
        if (node.arg && node.arg.type === 'Curry') {
          return fun;
        }
        const argFun = node.arg ? recurse(node.arg, partialFun) : null;
        return fun(argFun);
      } else if (node.type === 'Composition') {
        return ctx => {
          // FIXME: [{'a': 'foo'}, {'a': 'bar'}] | map ($.a | regex 'foo') fails if the 2 lines below are outside of this closure!?!?!?!?!?!?!?!?!?!?!?!?
          const combinators = node.combinators.map(combinator => recurse(combinator, partialFun));
          const argFun = recurse(node.target, partialFun);
          return transduce(combinators, argFun(ctx), node.combinators);
        };
      } else if (node.type === 'List') {
        const elements = node.elements.map(element => recurse(element, partialFun));
        return ctx => {
          return elements.map(element => element(ctx));
        };
      } else if (node.type === 'Partial') {
        const fun = transpileFun(node, aliases, request, partialFun);
        if (node.arg && node.arg.type === 'Curry') {
          if (partialFun) {
            return fun(partialFun);
          }
          return fun;
        }
        const argFun = node.arg ? recurse(node.arg, partialFun) : null;
        return fun(argFun);
      } else if (node.type === 'Apply') {
        const argFun = node.arg ? recurse(node.arg, partialFun) : null;
        if (node.partial && node.partial.type === 'Partial') {
          return recurse(node.partial, argFun);
        }
        throw new Error(`Cannot apply a non-partial node ${JSON.stringify(node)}`);
      } else if (node.type === 'Instance') {
        const pairs = {};
        node.elements.forEach(({ key, value }) => {
          pairs[key.value] = recurse(value, partialFun);
        });
        return ctx => {
          const result = {};
          Object.keys(pairs).forEach(key => {
            result[key] = pairs[key](ctx);
          });
          return result;
        };
      } else if (node.type === 'Text') {
        return () => node.value;
      } else if (node.type === 'Sink') {
        return () => {
          const content = parseTree.text.slice(node.start, node.end);
          return request('/tasitc/core/ns/sink')(() => {
            return node.path.value;
          })(content);
        };
      } else if (node.type === 'Context') {
        const scope = (ctx, paths) => {
          if (!paths.length) {
            return ctx;
          }
          const path = paths[0];
          if (path.type === 'Attribute') {
            return scope(ctx[path.attr.value], paths.slice(1));
          } else if (path.type === 'Subscript') {
            return scope(ctx[path.index.value], paths.slice(1));
          }
          throw new Error(`Unkown path of type in node: ${JSON.stringify(node)}`);
        };
        const scoped = ctx => {
          return scope(ctx, node.paths);
        };
        return ctx => {
          return scoped(ctx);
        };
      }

      throw new Error('TODO '+ JSON.stringify(node));
    };
    return recurse(node);
  };

  return (ctx, aliases, request) => {
    return aliases.then(aliases => {
      return init(parseTree.value, aliases, request)(ctx);
    });
  };
};

module.exports = transpile;
