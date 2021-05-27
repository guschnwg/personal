export default (config) => {
  config.devServer.writeToDisk = true;
  config.output.publicPath = '/front/';
};