import { pixelProofing } from "@/utils/pixelProofing";
import styled from "styled-components";

export const Wrapper = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px;
  overflow-y: auto;
`;

export const TextWrapper = styled.div`
  width: 100%;
  height: 100%;
  overflow-wrap: break-word;
  font-family: Poppins-SemiBold;
  font-style: normal;
  font-weight: 500;
  font-size: 0.96rem;
  line-height: 1.85rem;
  margin-left: 0.57rem;
  color: #000000;
`;

export const ImgWrapper = styled.div`
  width: 100%;
  height: 100%;
`

export const PostWapper = styled.div<{ marginTop: number | string }>`
  display: flex;
  flex-direction: column;
  margin-top: ${(props) =>
    typeof props.marginTop === "number"
      ? `${props.marginTop}px`
      : pixelProofing(props.marginTop)};
  width: calc(100% - 70px);
  padding: 27px 34px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
`;

export const Secret = styled.div`
  width: 60px;
  height: 60px;
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 30px;
`;

export const Image = styled.img`
  width: 100%;
  height: auto;
  object-fit: cover;
`;

