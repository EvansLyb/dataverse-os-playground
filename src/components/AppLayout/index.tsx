import { useEffect } from "react";
import DisplayFolder from "../DisplayFolder";
import DisplayPost from "../DisplayPost";
import Modal from "../Modal";
import PublishPost from "../PublishPost";
import Header from "./Header";
import {
  Container,
  HeaderWrapper,
  BodyWrapper,
  PublishPostWrapper,
  DisplayPostWrapper,
} from "./styled";

const Layout: React.FC = (): React.ReactElement => {
  return (
    <Container>
      <HeaderWrapper>
        <Header />
      </HeaderWrapper>
      <BodyWrapper>
        <PublishPostWrapper>
          <PublishPost />
          <DisplayPost />
          <DisplayPost />
          <DisplayPost />
          <DisplayPost />
          <DisplayPost />
        </PublishPostWrapper>
      </BodyWrapper>
    </Container>
  );
};

export default Layout;
