const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * O CMake 4 (necessário no Windows por causa do ninja com caminhos longos)
 * recusa projetos que declaram cmake_minimum_required abaixo de 3.5, como o
 * do react-native-skia. Esta flag manda o CMake aceitar esses projetos.
 *
 * Aplicada a todas as bibliotecas Android, via android/build.gradle.
 */
const MARKER = '// withCmakePolicyMinimum';

const BLOCK = `
${MARKER}
subprojects { project ->
    project.plugins.withId('com.android.library') {
        project.android.defaultConfig.externalNativeBuild.cmake.arguments '-DCMAKE_POLICY_VERSION_MINIMUM=3.5'
    }
}
`;

module.exports = function withCmakePolicyMinimum(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += BLOCK;
    }
    return mod;
  });
};
