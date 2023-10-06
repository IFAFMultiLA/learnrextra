const { readFileSync } = require('fs')
const { build } = require('esbuild')
const babelPlugin = require('esbuild-plugin-babel')

const excludeVendorFromSourceMapPlugin = ({ filter }) => ({
  name: 'excludeVendorFromSourceMap',
  setup (build) {
    build.onLoad({ filter }, args => {
      if (args.path.endsWith('.js')) {
        return {
          contents:
            readFileSync(args.path, 'utf8') +
            '\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==',
          loader: 'default'
        }
      }
    })
  }
})

const excludeNodeModules = excludeVendorFromSourceMapPlugin({
  filter: /node_modules/
})

const buildConfig = {
  sourcemap: true,
  bundle: true,
  minify: true,
  allowOverwrite: true,
  logLevel: 'info',
  target: ['es2015'],
  plugins: [excludeNodeModules, babelPlugin()]
}

const buildTutorialFormat = {
  entryPoints: ['adaptivelearnr-js/format/tutorial-format.js'],
  outfile: 'inst/rmarkdown/templates/tutorial/resources/tutorial-format.js',
  ...buildConfig
}

build(buildTutorialFormat).catch(() => process.exit(1))
