const fs = require('fs');
const { parse } = require('./parser');

// Hack
// const stdin = fs.readFileSync(0).toString();

// console.log(stdin);
// console.log(JSON.stringify(parse(stdin), null, 1));

// sue:     ("a" <|> "b" <|> "c" <|> "d" <|> "e" <|> "f" <|> "g")
// obj_val: (sue=lhs <&> ":" <&> (sue <|> obj)=rhs)
// obj:     ("{" <&> (obj_val <|> (obj_val <&> ","))* <&> "}")

const rules = {
  "sue": {
    a: [
      { v: "a" },
      { v: "b" },
      { v: "c" },
      // { v: "d" },
      // { v: "e" },
      // { v: "f" },
      // { v: "g" },
    ],
  },
  "obj_val": {
    intransitive: true,
    e: [
      { r: "sue", k: "lhs" },
      { v: ":" },
      {
        k: "rhs",
        a: [
          { r: "sue" },
          { r: "obj" },
        ],
      },
    ],
  },
  "obj": {
    intransitive: true,
    e: [
      { v: "{" },
      { r: "obj_val" },
      // {
      //   star: true,
      //   a: [
      //     { r: "obj_val" },
      //     {
      //       e: [
      //         { r: "obj_val" },
      //         { v: "," },
      //       ],
      //     },
      //   ]
      // },
      { v: "}" },
    ],
  },
};

// const input = "{a:{b:c},{d:e,f:g}}}";
const input = "{a:b,c:d}";


const exec = (rules, input) => {
  const iti = (rule, cursor) => {
    const token = input[cursor];
    if (rule.e) {
      let next_cursor = cursor;
      let match = true;
      for (const then_rule of rule.e) {
        const result = iti(then_rule, next_cursor);
        if (!result.match) {
          match = false;
          break;
        } else {
          next_cursor = result.cursor;
        }
      }
      return { match, cursor: next_cursor };
    } else if (rule.r) {
      return iti(rules[rule.r], cursor);
    } else if (rule.a) {
      for (const alt_rule of rule.a) {
        const result = iti(alt_rule, cursor);
        if (result.match) {
          return { match: true, cursor: result.cursor };
        }
      }
      return { match: false, cursor };
    } else if (rule.v) {
      const match = token === rule.v;
      return { match, cursor: cursor + 1 };
    }
    throw new Error(`Malformed rule: ${ JSON.stringify(rule) }`);
  };
  return iti(rules.obj, 0);
};

const { match, cursor } = exec(rules, input);
if (!match) {
  console.log('ERROR: unexpected token');
  console.log(input);
  for (let i = 0; i < cursor; i++) {
    process.stdout.write(" ");
  }
  process.stdout.write("^\n");
} else {
  console.log(input);
}


