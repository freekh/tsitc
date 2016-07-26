//usage: cat ~/foo | edit, echo 'blah blah' | edit foo, edit grep.tasitc, ...
(arg, ctx, { h, exec, ns, parameters }) => {
  const configPath = '~/.editor/config';

  return exec([
    configPath,
  ], ([config]) => {
    const keymap = config && config.keymap || 'emacs'; // TODO: || 'emacs'
    const theme = config && config.theme || 'monokai';
    if (!config) {
      ns.write(configPath, { keymap, theme }).then(path => {
        console.log('wrote config: ', path);
      });
    }

    const path = parameters.path;
    const mode = path.endsWith('tasitc') ? 'x-tasitc' : 'javascript';
    const modeUrl = path.endsWith('tasitc') && '/codemirror/addons/tasitc.js' || 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.16.0/mode/javascript/javascript.min.js';

    const execute = ([editorElem], [CodeMirror]) => {
      CodeMirror.commands.save = cm => {
        const content = cm.getValue();
        console.log('saving...;');
        ns.write(path, content).then(path => {
          console.log('saved to', path);
        });
      };
      ns.read(path).then(content => {
        const cm = CodeMirror(editorElem, {
          mode,
          keyMap: keymap,
          theme,
          value: content,
        });
      });
    };

    const exit = () => {
      console.log('exit!');
    };

    return {
      docs: '/tasitc/editor.app.docs',
      offline: false, // must be present && fails if offline: true and http(s) in scripts/styles
      scripts: [
        'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.16.0/codemirror.js',
        modeUrl,
        `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.16.0/keymap/${keymap}.js`,
      ],
      styles: [
        '/codemirror/scss', // builds scss
        'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.16.0/codemirror.css',
        `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.16.0/themes/${theme}.css`,
      ],
      elements: [h('div#editor')],
      execute,
      exit,
    };
  });
};
