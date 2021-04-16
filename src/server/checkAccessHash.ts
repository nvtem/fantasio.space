import PlayerModel from "./PlayerModel";

export default async function checkAccessHash(name: string, accessHash: string) {
  return await PlayerModel.findOneByParams({ name, accessHash })
}