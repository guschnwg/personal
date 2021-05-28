export default (config) => {
  if (config.devServer) {
    config.devServer.writeToDisk = true;
  }

  config.output.publicPath = '/front/';
};