import imgIcon from "@/assets/icons/img.svg";
import lockIcon from "@/assets/icons/lock.svg";
import crossIcon from "@/assets/icons/cross.svg";
import Button from "@/components/BaseComponents/Button";
import Textarea from "@/components/BaseComponents/Textarea";
import { displayMyPosts } from "@/state/folder/slice";
import { useAppDispatch, useSelector } from "@/state/hook";
import {
  displayPostList,
  encryptPost,
  postSlice,
  publishPost,
  uploadImg,
} from "@/state/post/slice";
import { privacySettingsSlice } from "@/state/privacySettings/slice";
import { addressAbbreviation, getAddressFromDid } from "@/utils/didAndAddress";
import { uuid } from "@/utils/uuid";
import { useState } from "react";
import ImageUploading, { ImageListType } from "react-images-uploading";
import { css } from "styled-components";
import AccountStatus from "../AccountStatus";
import { FlexRow } from "../App/styled";
import PrivacySettings from "../PrivacySettings";
import {
  ButtonWrapper,
  Content,
  UploadImg,
  UploadImgCross,
  UploadImgWrapper,
  Wrapper,
} from "./styled";
import { connectIdentity } from "@/state/identity/slice";
import { Message } from "@arco-design/web-react";
import { IconArrowRight } from "@arco-design/web-react/icon";

export interface PublishPostProps {}

const PublishPost: React.FC<PublishPostProps> = ({}) => {
  const dispatch = useAppDispatch();
  const did = useSelector((state) => state.identity.did);
  const needEncrypt = useSelector((state) => state.privacySettings.needEncrypt);
  const settings = useSelector((state) => state.privacySettings.settings);
  const encryptedContent = useSelector((state) => state.post.encryptedContent);
  const isEncrypting = useSelector((state) => state.post.isEncrypting);
  const isEncryptedSuccessfully = useSelector(
    (state) => state.post.isEncryptedSuccessfully
  );
  const isPublishingPost = useSelector((state) => state.post.isPublishingPost);
  const litKit = useSelector((state) => state.post.litKit);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageListType>([]);
  const maxNumber = 69;

  const onChange = (imageList: ImageListType, addUpdateIndex?: number[]) => {
    setImages(imageList);
  };

  const onError = (error: any) => {
    if (error?.maxNumber) {
      Message.info("Up to four pictures can be uploaded");
    }
  };

  const textareaOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.currentTarget.value);
    dispatch(postSlice.actions.clearEncryptedState());
  };

  const encrypt = async () => {
    if (isEncrypting || isEncryptedSuccessfully) return;
    if (!did) {
      Message.info("Please connect identity first.");
      return;
    }
    dispatch(
      encryptPost({
        did,
        postContent: {
          text: content,
          images: images.map((image) => image["upload"]),
          videos: [],
        },
      })
    );
  };

  const post = async () => {
    if (isPublishingPost) return;
    const { payload: did } = await dispatch(connectIdentity());
    if (needEncrypt) {
      const amountReg = new RegExp("^([0-9][0-9]*)+(.[0-9]{1,17})?$");
      const { amount, collectLimit } = settings;
      const isValid =
        amount &&
        collectLimit &&
        amountReg.test(String(amount)) &&
        amount > 0 &&
        collectLimit > 0;
      if (!isValid) {
        Message.info("Incorrect privacy settings!");
        return;
      }
    }
    const files: File[] = [];
    images.map((image) => {
      if (image.file) {
        files.push(image.file);
      }
    });
    await dispatch(
      publishPost({
        did: did as string,
        postContent: {
          text: content,
          images: (await (
            await dispatch(uploadImg({ files }))
          ).payload) as string[],
          videos: [],
        },
      })
    );
    Message.success({
      content: (
        <>
          Post successfully!
          <a
            href={`${process.env.DATAVERSE_OS}/finder`}
            target="_blank"
            style={{ marginLeft: "5px", color: "black" }}
          >
            <span style={{ textDecoration: "underline" }}>
              View on DataverseOS File System
            </span>
            <IconArrowRight
              style={{
                color: "black",
                transform: "rotate(-45deg)",
              }}
            />
          </a>
        </>
      ),
    });
    setContent("");
    setImages([]);
    dispatch(displayPostList());
    dispatch(postSlice.actions.setIsPublishingPost(false));
  };

  const openPrivacySettings = () => {
    dispatch(privacySettingsSlice.actions.setModalVisible(true));
  };

  return (
    <Wrapper>
      <Content>
        <ImageUploading
          multiple
          maxNumber={4}
          value={images}
          onChange={onChange}
          onError={onError}
          dataURLKey="upload"
        >
          {({
            imageList,
            onImageUpload,
            onImageRemoveAll,
            onImageUpdate,
            onImageRemove,
            isDragging,
            dragProps,
          }) => (
            <>
              <AccountStatus
                name={addressAbbreviation(getAddressFromDid(did)) ?? ""}
                cssStyles={css`
                  margin-bottom: 1rem;
                `}
                did={did}
              />
              <Textarea
                value={encryptedContent || content}
                placeholder="what's happening?"
                onChange={textareaOnChange}
                width={"100%"}
                height={147}
              />
              <FlexRow>
                {imageList.map((image, index) => (
                  <UploadImgWrapper key={uuid()}>
                    <UploadImgCross
                      src={crossIcon}
                      onClick={() => {
                        onImageRemove(index);
                      }}
                    />
                    <UploadImg
                      src={image["upload"]}
                      onClick={() => {
                        onImageUpdate(index);
                      }}
                    />
                  </UploadImgWrapper>
                ))}
              </FlexRow>
              <ButtonWrapper>
                <FlexRow>
                  <Button type="icon" width={"1.75rem"} onClick={onImageUpload}>
                    <img src={imgIcon} />
                  </Button>
                  <Button
                    type="icon"
                    width={"1.75rem"}
                    css={css`
                      margin-left: 26px;
                    `}
                    onClick={openPrivacySettings}
                  >
                    <img src={lockIcon} />
                  </Button>
                </FlexRow>
                <FlexRow>
                  <Button
                    type="primary"
                    loading={isPublishingPost}
                    onClick={post}
                    width={"1.4375rem"}
                    css={css`
                      border-radius: 8px;
                      padding: 0.3rem 2rem;
                    `}
                  >
                    Post
                  </Button>
                </FlexRow>
              </ButtonWrapper>
            </>
          )}
        </ImageUploading>
      </Content>
      <PrivacySettings></PrivacySettings>
    </Wrapper>
  );
};

export default PublishPost;
