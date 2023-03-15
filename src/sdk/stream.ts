import { CustomMirrorFile, Post, PostStream, PostType } from "@/types";
import { getAddressFromDid } from "@/utils/didAndAddress";
import {
  Apps,
  Currency,
  DatatokenVars,
  DecryptionConditionsTypes,
  FileType,
  IndexFileContentType,
  MirrorFile,
  ModelNames,
} from "@dataverse/runtime-connector";
import {
  runtimeConnector,
  appName,
  modelNames,
  modelName,
  appVersion,
} from ".";
import { getModelIdByAppNameAndModelName } from "./appRegistry";
import { newLitKey, encryptWithLit } from "./encryptionAndDecryption";
import { createDatatoken, getChainOfDatatoken } from "./monetize";

export const loadStream = async (streamId: string) => {
  const stream = await runtimeConnector.loadStream(streamId);
  return stream;
};

export const loadMyPostStreams = async (did: string) => {
  const streams = await runtimeConnector.loadStreamsByModelAndDID({
    did,
    appName,
    modelName,
  });

  const streamList: { streamId: string; streamContent: any }[] = [];

  Object.entries(streams).forEach(([streamId, streamContent]) => {
    streamList.push({
      streamId,
      streamContent,
    });
  });

  return streamList;
};

export const loadAllPostStreams = async () => {
  const streams = await runtimeConnector.loadStreamsByModel({
    appName,
    modelName,
  });

  const streamList: PostStream[] = [];

  Object.entries(streams).forEach(([streamId, streamContent]) => {
    streamList.push({
      streamId,
      streamContent,
    });
  });
  const sortedList = streamList
    .filter((el) => el.streamContent.content.appVersion === appVersion)
    .map((el, index) => {
      try {
        el.streamContent.content.content = JSON.parse(
          el.streamContent.content.content as string
        );
      } catch (error) {
        console.log(el);
        console.log(error);
      }
      return el;
    })
    .filter(
      (el) =>
        el.streamContent.content.content &&
        Object.keys(el.streamContent.content.content).length > 0
    )
    .sort(
      (a, b) =>
        Date.parse(b.streamContent.createdAt) -
        Date.parse(a.streamContent.createdAt)
    );
  return sortedList;
};

export const createPublicPostStream = async ({
  did,
  post,
}: {
  did: string;
  post: Post;
}) => {
  const streamObject = await runtimeConnector.createStream({
    did,
    appName,
    modelName,
    streamContent: {
      appVersion,
      content: JSON.stringify(post),
    },
    fileType: FileType.Public,
  });

  return streamObject;
};

export const createPrivatePostStream = async ({
  did,
  content,
  litKit,
}: {
  did: string;
  content: string;
  litKit: {
    encryptedSymmetricKey: string;
    decryptionConditions: any[];
    decryptionConditionsType: DecryptionConditionsTypes;
  };
}) => {
  const streamObject = await runtimeConnector.createStream({
    did,
    appName,
    modelName,
    streamContent: {
      appVersion,
      content,
    },
    fileType: FileType.Private,
    ...litKit,
  });
  return streamObject;
};

export const createDatatokenPostStream = async ({
  did,
  post,
  currency,
  amount,
  collectLimit,
}: {
  did: string;
  post: Post;
  currency: Currency;
  amount: number;
  collectLimit: number;
}) => {
  const res = await createPublicPostStream({ did, post: {} as Post });
  let datatokenId;
  try {
    const res2 = await createDatatoken({
      streamId: res.newMirror!.mirrorId,
      currency,
      amount,
      collectLimit, 
    });
    datatokenId = res2.datatokenId;
  } catch (error: any) {
    console.log(error);
    await deletePostStream({ did, mirrorId: res.newMirror!.mirrorId });
    throw error;
  }
  const res2 = await updatePostStreamsWithAccessControlConditions({
    did,
    address: getAddressFromDid(did),
    mirrorFile: {
      contentId: res.streamId,
      content: { appVersion: res.streamContent.appVersion, content: post },
      datatokenId,
      contentType: await getModelIdByAppNameAndModelName(ModelNames.post),
    } as unknown as CustomMirrorFile,
  });

  return res2;
};

export const deletePostStream = async ({
  did,
  mirrorId,
}: {
  did: string;
  mirrorId: string;
}) => {
  const res = await runtimeConnector.removeMirrors({
    did,
    appName,
    mirrorIds: [mirrorId],
  });
  return res;
};

export const updatePostStreamsToPublicContent = async ({
  content,
  mirrorFile,
}: {
  content: string;
  mirrorFile: MirrorFile;
}) => {
  if (!mirrorFile) return;
  const { contentId: streamId, content: streamContent } = mirrorFile;
  if (!streamId || !streamContent) return;

  streamContent.content = content; //public content

  const streams = await runtimeConnector.updateStreams({
    streamsRecord: {
      [streamId]: {
        streamContent,
        fileType: FileType.Public,
      },
    },
    syncImmediately: true,
  });
  return streams;
};

export const updatePostStreamsWithAccessControlConditions = async ({
  did,
  address,
  mirrorFile,
}: {
  did: string;
  address: string;
  mirrorFile: CustomMirrorFile;
}) => {
  if (!mirrorFile) return;
  const {
    contentId: streamId,
    content: streamContent,
    datatokenId,
  } = mirrorFile;
  if (!streamId) return;

  let litKit;

  let decryptionConditions: any[];
  let decryptionConditionsType: DecryptionConditionsTypes;

  if (!datatokenId) {
    decryptionConditions = await generateAccessControlConditions({
      did,
      address,
    });
    decryptionConditionsType = DecryptionConditionsTypes.AccessControlCondition;

    mirrorFile.fileType = FileType.Private;
    streamContent.content.postType = PostType.Private;
  } else {
    decryptionConditions = await generateUnifiedAccessControlConditions({
      did,
      address,
      datatokenId,
    });
    decryptionConditionsType =
      DecryptionConditionsTypes.UnifiedAccessControlCondition;

    mirrorFile.fileType = FileType.Datatoken;
    streamContent.content.postType = PostType.Datatoken;
  }

  litKit = await newLitKey({
    did,
    decryptionConditions,
    decryptionConditionsType,
  });

  const { encryptedContent } = await encryptWithLit({
    did,
    contentToBeEncrypted:
      mirrorFile.contentType in IndexFileContentType
        ? mirrorFile.contentId!
        : JSON.stringify(mirrorFile.content.content.postContent),
    litKit,
  });

  streamContent.content.postContent = encryptedContent;
  streamContent.content.updatedAt = new Date().toISOString();

  await runtimeConnector.updateStreams({
    streamsRecord: {
      [streamId]: {
        streamContent: {
          appVersion: streamContent.appVersion,
          content: JSON.stringify(streamContent.content),
        },
        fileType: mirrorFile.fileType,
        ...(datatokenId && { datatokenId: mirrorFile.datatokenId }),
        ...litKit,
      },
    },
    syncImmediately: true,
  });

  mirrorFile.content.content.postContent = encryptedContent;

  mirrorFile.fileKey = undefined;
  mirrorFile.encryptedSymmetricKey = litKit.encryptedSymmetricKey;
  mirrorFile.decryptionConditions = litKit.decryptionConditions;
  mirrorFile.decryptionConditionsType = litKit.decryptionConditionsType;

  return mirrorFile;
};

export const updateFileStreamsWithAccessControlConditions = async ({
  did,
  address,
  mirrorFile,
}: {
  did: string;
  address: string;
  mirrorFile: CustomMirrorFile;
}) => {
  if (!mirrorFile) return;
  const { contentId, indexFileId, datatokenId } = mirrorFile;
  if (!contentId) return;

  let litKit;

  let decryptionConditions: any[];
  let decryptionConditionsType: DecryptionConditionsTypes;

  if (!datatokenId) {
    decryptionConditions = await generateAccessControlConditions({
      did,
      address,
    });
    decryptionConditionsType = DecryptionConditionsTypes.AccessControlCondition;

    mirrorFile.fileType = FileType.Private;
  } else {
    decryptionConditions = await generateUnifiedAccessControlConditions({
      did,
      address,
      datatokenId,
    });
    decryptionConditionsType =
      DecryptionConditionsTypes.UnifiedAccessControlCondition;

    mirrorFile.fileType = FileType.Datatoken;
  }

  litKit = await newLitKey({
    did,
    decryptionConditions,
    decryptionConditionsType,
  });

  const { encryptedContent } = await encryptWithLit({
    did,
    contentToBeEncrypted: mirrorFile.contentId!,
    litKit,
  });

  const res = await runtimeConnector.updateMirror({
    did,
    appName,
    mirrorId: indexFileId,
    fileInfo: {
      fileType: mirrorFile.fileType,
      contentId: encryptedContent,
      ...(datatokenId && { datatokenId }),
      ...litKit,
    },
    syncImmediately: true,
  });

  mirrorFile.contentId = encryptedContent;
  mirrorFile.fileKey = res.currentMirror.mirrorFile.fileKey;
  mirrorFile.encryptedSymmetricKey = litKit.encryptedSymmetricKey;
  mirrorFile.decryptionConditions = litKit.decryptionConditions;
  mirrorFile.decryptionConditionsType = litKit.decryptionConditionsType;

  return mirrorFile;
};

export const generateAccessControlConditions = async ({
  did,
  address,
}: {
  did: string;
  address: string;
}) => {
  const modelId = await runtimeConnector.getModelIdByAppNameAndModelName({
    appName,
    modelName: ModelNames.post,
  });
  const chain = await runtimeConnector.getChainFromDID(did);
  const conditions: any[] = [
    {
      contractAddress: "",
      standardContractType: "",
      chain,
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: `${address}`,
      },
    },
    { operator: "and" },
    {
      contractAddress: "",
      standardContractType: "SIWE",
      chain,
      method: "",
      parameters: [":resources"],
      returnValueTest: {
        comparator: "contains",
        value: `ceramic://*?model=${modelId}`,
      },
    },
  ];

  return conditions;
};

export const generateUnifiedAccessControlConditions = async ({
  did,
  address,
  datatokenId,
}: {
  did: string;
  address: string;
  datatokenId: string;
}) => {
  const modelId = await runtimeConnector.getModelIdByAppNameAndModelName({
    appName,
    modelName: ModelNames.post,
  });
  const chain = await runtimeConnector.getChainFromDID(did);
  const datatokenChain = await getChainOfDatatoken();
  const conditions: any = [
    {
      conditionType: "evmBasic",
      contractAddress: "",
      standardContractType: "SIWE",
      chain,
      method: "",
      parameters: [":resources"],
      returnValueTest: {
        comparator: "contains",
        value: `ceramic://*?model=${modelId}`,
      },
    },
  ];
  conditions.push({ operator: "and" });
  const unifiedAccessControlConditions = [
    {
      contractAddress: datatokenId,
      conditionType: "evmContract",
      functionName: "isCollected",
      functionParams: [":userAddress"],
      functionAbi: {
        inputs: [
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
        ],
        name: "isCollected",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      chain: datatokenChain,
      returnValueTest: {
        key: "",
        comparator: "=",
        value: "true",
      },
    },
    { operator: "or" },
    {
      conditionType: "evmBasic",
      contractAddress: "",
      standardContractType: "",
      chain,
      method: "",
      parameters: [":userAddress"],
      returnValueTest: {
        comparator: "=",
        value: `${address}`,
      },
    },
  ];
  conditions.push(unifiedAccessControlConditions);
  return conditions;
};
