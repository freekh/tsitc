'use strict'

const P = require('parsimmon')

const ignore = (parser) => P.optWhitespace.then(parser).skip(P.optWhitespace)

const form = (expr) => {
  return P.string('(').then(expr).skip(P.string(')'))
}

class Sink {
  constructor(expression, path) {
    this.expression = expression
    this.path = path
  }
}
Sink.parser = P.lazy('Sink', () => {
  return Comprehension.parser.skip(P.optWhitespace).chain(expression => {
    const reify = (path) => {
      return new Sink(expression, path)
    }
    return ignore(P.string('>')).then(Id.parser).map(reify)
  })
})

class Comprehension {
  constructor(expression, targets = []) {
    this.expression = expression
    this.targets = targets
  }
}
Comprehension.parser = P.lazy('Comprehension', () => {
  const reify = (expressions) => {
    if (expressions.length === 1) {
      return expressions[0]
    } else {
      return new Comprehension(expressions[0], expressions.slice(1))
    }
  }
  return ignore(P.sepBy1(P.alt(
    Context.parser,
    Call.parser
  ), ignore(P.string('|')))).map(reify)
})


class Call { //TODO: rename to Request?
  constructor(id, args = []) {
    this.id = id
    this.args = args
  }
}
Call.parser = P.lazy('Call', () => {
  const expr = Id.parser.chain(id => {
    const reify = args => {
      return new Call(id, args || [])
    }
    return P.alt(
      P.whitespace
        .then(
          P.sepBy(Argument.parser, P.whitespace)
        ).skip(P.optWhitespace),
      P.optWhitespace
    ).map(reify)
  })
  return P.alt(
    form(ignore(expr)),
    ignore(expr)
  )
})


class Argument { //TODO:?
}
Argument.parser = P.lazy('Argument', () => {
  return P.alt(
    form(Comprehension.parser),
    form(Str.parser),
    form(Id.parser),
    Keyword.parser,
    Parameter.parser,
    Str.parser,
    Id.parser
  )
})

class Keyword {
  constructor(id, value) {
    this.id = id
    this.value = value
  }
}
Keyword.parser = P.lazy('Keyword', () => {
  return P.string('--').then(P.letters.chain(id => {
    const reify = (value) => {
      return new Keyword(id, value)
    }
    return P.string('=').then(Call.parser).map(reify)
  }))
})

class Parameter {
  constructor(id) {
    this.id = id
  }
}
Parameter.parser = P.lazy('Parameter', () => {
  const reify = (id) => {
    return new Parameter(id)
  }
  const parameterId = P.regex(/[a-z_]*/i)
  return P.string('?').then(parameterId).map(reify)
})

class Context { //$
  constructor(path = []) {
    this.id = '$'
    this.path = path
  }
}
Context.parser = P.lazy('Context', () => {
  const reify = (path) => {
    return new Context(path)
  }
  return P.string('$').then(P.alt(
    Subscript.parser,
    Attribute.parser
  ).many()).map(reify)
})

class Attribute { //foo.column
  constructor(attr) {
    this.attr = attr
  }
}
Attribute.parser = P.lazy('Attribute', () => {
  const reify = (id) => {
    return new Attribute(id)
  }
  return P.string('.').then(Id.parser).map(reify)
})


class Subscript { //[1][0]
  constructor(index) {
    this.index = index
  }
}
Subscript.parser = P.lazy('Subscript', () => {
  const reify = (num) => {
    return new Subscript(num)
  }
  return P.string('[').then(Num.parser).skip(P.string(']')).map(reify)
})

class Id { //TODO: rename to Path?
  constructor(value) {
    this.value = value
  }
}
Id.parser = P.lazy('Id', () => {
  const reify = id => {
    return new Id(id)
  }
  return P.regex(/[\~\/a-zA-Z\-0-9_]+/i).map(reify)
})

class Str { //TODO: rename?
  constructor(value) {
    this.value = value
  }
}
Str.parser = P.lazy('Str', () => {
  const reify = (str) => {
    return new Str(str)
  }
  //FIXME:
  return P.string('\'').then(P.regex(/[\.a-zA-Z0-9]*/i)).skip(P.string('\'')).map(reify)
})

class Num { //TODO: rename?
  constructor(value) {
    this.value = value
  }
}
Num.parser = P.lazy('Num', () => {
  const reify = (num) => {
    return new Num(parseInt(num))
  }
  return P.regex(/[0-9]*/i).map(reify)
})


//

const parse = (input) => {
  return P.alt(
    Sink.parser,
    Comprehension.parser
  ).parse(input)
}

const uniq = array => {
    const seen = {};
    const out = [];
    let j = 0;
    for(let i = 0; i < array.length; i++) {
         const item = array[i]
         if(seen[item] !== 1) {
               seen[item] = 1
               out[j++] = item
         }
    }
    return out
}

module.exports = {
  ast: {
    Sink, Comprehension, Call, Argument, Keyword, Parameter, Context, Attribute, Subscript, Id, Str, Num
  },
  parse,
  error: (expr, result) => {
    console.log('##############################')
    console.log(expr)
    console.log('##############################')

    if (true || !result.status) {
      console.log(JSON.stringify(result, null, 2))
    }
    if (result.status === false) {
      let indents = ''
      let column = 0
      let line = 1
      for (let i = 0; i < result.index; i++) {
        if (expr[i] === '\n') {
          indents = ''
          column = 0
          line += 1
        } else {
          indents += '~'
          column += 1
        }
      }
      console.log('\x1b[91m', '\nFAILURE: line: ' + line + ', column: ' + column+ '\n','\x1b[0m')
      console.log(' ' + expr.split('\n').slice(line - 3 > 0 ? line - 3 : 0, line).join('\n '))
      console.log('\x1b[91m', indents + '^','\x1b[0m')
      console.log(' ' + expr.split('\n').slice(line, line + 3 <= expr.length ? line + 3 : expr.length).join('\n '))
      const expected = uniq(result.expected).join(' or ')
      console.log('\x1b[91m', `Got: '${expr[result.index] ? expr[result.index].replace('\n', '\\n'): 'EOF'}'. Expected: ${expected}\n`,'\x1b[0m')
    }
  }
}
